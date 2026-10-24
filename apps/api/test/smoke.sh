#!/usr/bin/env bash
# End-to-end smoke test of the HTTP API against a running server.
#
#   npm run db:seed && npm run start:dev      (in another terminal)
#   npm run test:smoke
#
# It signs in as the seeded demo accounts and changes their data, so run
# `npm run db:seed` again afterwards to restore the demo community.
# ORIGIN must be one of the API's ALLOWED_ORIGIN values.
API=${API:-http://localhost:3001}
ORIGIN=${ORIGIN:-http://localhost:3000}
SEED="$(dirname "$0")/../prisma/seed.ts"
PW=$(grep -oE "SEED_PASSWORD \|\| '[^']+'" "$SEED" | sed -E "s/.*'([^']+)'/\1/")
DIR=$(mktemp -d)
pass=0; fail=0

check() { # name, condition result (0 ok)
  if [ "$2" = "0" ]; then pass=$((pass+1)); echo "  ok   $1"; else fail=$((fail+1)); echo "  FAIL $1 ${3:-}"; fi
}
# req <jar> <method> <path> [json]  -> prints "<status>\n<body>"
req() {
  local jar="$DIR/$1.jar" method=$2 path=$3 body=${4:-}
  local args=(-s -o "$DIR/body" -w '%{http_code}' -b "$jar" -c "$jar" -H "Origin: $ORIGIN" -X "$method")
  if [ "$method" != "GET" ]; then
    local tok; tok=$(curl -s -b "$jar" -c "$jar" -H "Origin: $ORIGIN" "$API/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
    args+=(-H "X-CSRF-Token: $tok" -H 'Content-Type: application/json')
    [ -n "$body" ] && args+=(-d "$body")
  fi
  STATUS=$(curl "${args[@]}" "$API$path"); BODY=$(cat "$DIR/body")
}
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(eval(process.argv[1]))})" "$1" <<<"$BODY"; }
login() { req "$1" POST /auth/login "{\"email\":\"$1@demo.skillswap.test\",\"password\":\"$PW\"}"; }

echo "health"
req anon GET /health; check "GET /health 200" $([ "$STATUS" = 200 ]; echo $?) "$STATUS $BODY"
check "database ok" $([ "$(json 'j.database')" = ok ]; echo $?)

echo "auth"
req anon GET /users/me; check "unauthenticated /users/me is 401" $([ "$STATUS" = 401 ]; echo $?) "$STATUS"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "$API/auth/login")
check "POST without CSRF token is 403" $([ "$STATUS" = 403 ]; echo $?) "$STATUS"
req anon POST /auth/login '{"email":"aarav@demo.skillswap.test","password":"wrong-password"}'
check "wrong password is 401" $([ "$STATUS" = 401 ]; echo $?) "$STATUS"
login aarav; check "login aarav" $([ "$STATUS" = 200 ]; echo $?) "$STATUS $BODY"
grep -q 'HttpOnly' "$DIR/aarav.jar"; check "cookies are HttpOnly" $?
login sara; check "login sara (mixed-case email accepted)" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
login rohan; check "login rohan" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"

echo "profile"
req aarav GET /users/me; check "GET /users/me" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
AARAV=$(json 'j.id')
check "me has no secrets" $([ "$(json '["passwordHash","refreshTokenHash","googleRefreshToken"].some(k=>k in j)')" = false ]; echo $?)
check "me has availability + reviewCount" $([ "$(json 'j.availability.length>0 && j.reviewCount===2')" = true ]; echo $?) "$BODY"
req aarav PATCH /users/me '{"name":"Aarav Mehta","bio":"Updated bio","college":"IIT Bombay","avatarUrl":"","availability":["MON_EVENING","WED_EVENING","SAT_MORNING"]}'
check "PATCH /users/me with blank avatar URL" $([ "$STATUS" = 200 ]; echo $?) "$STATUS $BODY"
check "PATCH returns full profile (badges kept)" $([ "$(json 'Array.isArray(j.badges) && j.avatarUrl===null')" = true ]; echo $?)
req aarav PATCH /users/me '{"availability":["FUNDAY_NOON"]}'
check "invalid availability slot is 400" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req aarav PATCH /users/me '{"avatarUrl":"javascript:alert(1)"}'
check "javascript: avatar URL is 400" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req aarav GET /users/me/overview; check "GET overview" $([ "$STATUS" = 200 ]; echo $?) "$STATUS $BODY"
check "overview stats" $([ "$(json 'j.stats.connections===1 && j.stats.completedSessions===2 && j.upcomingSessions.length===1')" = true ]; echo $?) "$BODY"

echo "skills"
req aarav POST /skills/wanted '{"name":"  pUBLIC   speaking "}'
check "add wanted skill (case/space-insensitive)" $([ "$STATUS" = 201 ]; echo $?) "$STATUS $BODY"
req aarav GET /skills/wanted
check "no duplicate skill row created" $([ "$(json 'j.length===2 && j.filter(s=>s.name==="Public Speaking").length===1')" = true ]; echo $?) "$BODY"

echo "matching"
req aarav GET /matches; check "GET /matches" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
check "best match is Priya, already connected" $([ "$(json 'j[0].name==="Priya Nair" && j[0].isConnected && j[0].matchPercent>50')" = true ]; echo $?) "$(json 'JSON.stringify(j.slice(0,3).map(m=>[m.name,m.matchPercent,m.connectionStatus]))')"
check "matches expose no secrets/emails" $([ "$(json '!new RegExp("passwordHash|refreshToken|@demo").test(JSON.stringify(j))')" = true ]; echo $?)
SARA=$(json 'j.find(m=>m.name==="Sara Khan").userId')
check "unconnected match has null matchId" $([ "$(json 'j.find(m=>m.name==="Sara Khan").matchId')" = null ]; echo $?)
req aarav GET "/matches?q=piano"; check "search by skill" $([ "$(json 'j.length>0 && j.every(m=>/piano/i.test(JSON.stringify(m)))')" = true ]; echo $?) "$BODY"
req aarav GET "/users/$SARA"; check "public profile" $([ "$STATUS" = 200 ] && [ "$(json 'j.offeredSkills.length===2 && j.connection===null && !("email" in j)')" = true ]; echo $?) "$STATUS $BODY"
req aarav GET /users/not-a-uuid; check "bad profile id is 400" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"

echo "connection requests"
req aarav POST "/matches/connect/$SARA"; check "connect -> PENDING" $([ "$(json 'j.status')" = PENDING ]; echo $?) "$STATUS $BODY"
MATCH=$(json 'j.matchId')
req aarav POST "/matches/connect/$SARA"; check "repeat connect stays PENDING" $([ "$(json 'j.status')" = PENDING ]; echo $?)
req aarav POST "/matches/$MATCH/accept"; check "requester cannot accept own request (403)" $([ "$STATUS" = 403 ]; echo $?) "$STATUS"
req aarav GET "/matches/$MATCH/messages"; check "no chat before acceptance (403)" $([ "$STATUS" = 403 ]; echo $?) "$STATUS"
req aarav POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"2030-01-01T10:00:00.000Z\",\"durationMinutes\":60}"
check "no session before acceptance (403)" $([ "$STATUS" = 403 ]; echo $?) "$STATUS $BODY"
req rohan POST "/matches/$MATCH/accept"; check "outsider cannot see the match (404)" $([ "$STATUS" = 404 ]; echo $?) "$STATUS"
req sara GET /matches/requests; check "sara sees incoming request" $([ "$(json 'j.incoming.some(r=>r.user.name==="Aarav Mehta")')" = true ]; echo $?) "$BODY"
req sara POST "/matches/$MATCH/accept"; check "recipient accepts" $([ "$(json 'j.status')" = ACCEPTED ]; echo $?) "$STATUS $BODY"
req sara GET /matches/connections; check "connection listed" $([ "$(json 'j.some(c=>c.matchId==="'$MATCH'")')" = true ]; echo $?)
req aarav GET "/matches/$MATCH"; check "match detail + swappable skills" $([ "$(json 'j.partner.name==="Sara Khan" && j.swappableSkills.includes("Public Speaking") && j.swappableSkills.includes("SQL")')" = true ]; echo $?) "$BODY"

echo "sessions"
req aarav POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"2020-01-01T10:00:00.000Z\",\"durationMinutes\":60}"
check "past session is 400" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
WHEN=$(node -e "console.log(new Date(Date.now()+8000).toISOString())")
req aarav POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"$WHEN\",\"durationMinutes\":30,\"topic\":\"Public Speaking\",\"notes\":\"  \"}"
check "schedule without Google Calendar or Daily" $([ "$STATUS" = 201 ]; echo $?) "$STATUS $BODY"
SESSION=$(json 'j.id')
check "session has a meeting link + partner" $([ "$(json '/^https:\/\//.test(j.meetingLink) && j.partner.name==="Sara Khan" && j.notes===null')" = true ]; echo $?) "$BODY"
req sara GET /sessions; check "list sessions" $([ "$STATUS" = 200 ]; echo $?)
check "sessions leak no hashes/tokens/emails" $([ "$(json '!new RegExp("passwordHash|refreshToken|email","i").test(JSON.stringify(j))')" = true ]; echo $?)
req rohan GET "/sessions/$SESSION"; check "outsider cannot read session (404)" $([ "$STATUS" = 404 ]; echo $?) "$STATUS"
req sara POST "/sessions/$SESSION/review" '{"rating":5}'; check "no review before completion (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
sleep 9
req sara POST "/sessions/$SESSION/complete"; check "complete after start" $([ "$(json 'j.status')" = COMPLETED ]; echo $?) "$STATUS $BODY"
req sara POST "/sessions/$SESSION/cancel"; check "completed session cannot be cancelled (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req sara POST "/sessions/$SESSION/review" '{"rating":6}'; check "rating 6 is 400" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req sara POST "/sessions/$SESSION/review" '{"rating":4,"comment":"Clear and friendly."}'; check "submit review" $([ "$STATUS" = 201 ]; echo $?) "$STATUS $BODY"
req sara POST "/sessions/$SESSION/review" '{"rating":1}'; check "duplicate review is 409" $([ "$STATUS" = 409 ]; echo $?) "$STATUS $BODY"
req sara GET /users/me; check "First Swap badge awarded on completion" $([ "$(json 'j.badges.some(b=>b.badge.name==="First Swap")')" = true ]; echo $?) "$BODY"
req aarav GET /users/me; check "reviewee rating recalculated (3 reviews)" $([ "$(json 'j.reviewCount===3 && Math.abs(j.ratingAvg-14/3)<1e-6')" = true ]; echo $?) "$(json 'j.reviewCount+" "+j.ratingAvg')"
WHEN2=$(node -e "console.log(new Date(Date.now()+86400000).toISOString())")
req aarav POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"$WHEN2\",\"durationMinutes\":45}"; S2=$(json 'j.id')
req sara POST "/sessions/$S2/complete"; check "cannot complete before start (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req sara POST "/sessions/$S2/cancel"; check "cancel scheduled session" $([ "$(json 'j.status')" = CANCELLED ]; echo $?) "$STATUS $BODY"

echo "leaderboard + calendar"
req aarav GET /leaderboard; check "leaderboard ranks Aarav first" $([ "$(json 'j[0].name==="Aarav Mehta" && j[0].completedSessions===3')" = true ]; echo $?) "$(json 'JSON.stringify(j.slice(0,3).map(u=>[u.name,u.completedSessions]))')"
STATUS=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -b "$DIR/aarav.jar" "$API/calendar/connect")
check "calendar connect redirects cleanly when unconfigured" $([[ "$STATUS" == "302 $ORIGIN/schedule/success?status=error" ]]; echo $?) "$STATUS"

echo "credits"
req aarav GET /credits; check "GET /credits" $([ "$STATUS" = 200 ]; echo $?) "$STATUS $BODY"
check "seeded wallet: balance 11, 4 held, 3 redeemable" $([ "$(json 'j.balance===11 && j.held===4 && j.earnedTeaching===3 && j.redeemable===3')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.held,j.earnedTeaching,j.redeemable])')"
check "ledger adds up to the balance" $([ "$(json 'j.transactions.reduce((s,t)=>s+t.amount,0)===j.balance')" = true ]; echo $?)
req sara GET /credits; check "First Swap badge paid its bonus once (8 + 4)" $([ "$(json 'j.balance===12 && j.redeemable===0')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.redeemable])')"
WHEN3=$(node -e "console.log(new Date(Date.now()+8000).toISOString())")
req sara POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"$WHEN3\",\"durationMinutes\":30,\"kind\":\"LESSON\",\"topic\":\"SQL\"}"
check "book a paid lesson (30 min = 2 credits)" $([ "$STATUS" = 201 ] && [ "$(json 'j.creditCost===2 && j.role==="learner"')" = true ]; echo $?) "$STATUS $BODY"
LESSON=$(json 'j.id')
req sara GET /credits; check "learner's credits are held at booking" $([ "$(json 'j.balance===10 && j.held===2')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.held])')"
req aarav GET /credits; check "teacher is not paid yet, sees 2 incoming" $([ "$(json 'j.balance===11 && j.incoming===2')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.incoming])')"
req sara POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"$WHEN2\",\"durationMinutes\":240,\"kind\":\"LESSON\"}"
check "cannot book a lesson without enough credits (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS $BODY"
req sara GET /credits; check "failed booking leaves the balance untouched" $([ "$(json 'j.balance')" = 10 ]; echo $?)
req sara POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"$WHEN2\",\"durationMinutes\":60,\"kind\":\"FREEBIE\"}"
check "unknown session kind is 400" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
sleep 9
req aarav POST "/sessions/$LESSON/complete"; check "teacher cannot release their own payment (403)" $([ "$STATUS" = 403 ]; echo $?) "$STATUS $BODY"
req sara POST "/sessions/$LESSON/cancel"; check "learner cannot cancel a started lesson for a refund (403)" $([ "$STATUS" = 403 ]; echo $?) "$STATUS $BODY"
req sara POST "/sessions/$LESSON/complete"; check "learner confirms the lesson" $([ "$(json 'j.status')" = COMPLETED ]; echo $?) "$STATUS $BODY"
req sara POST "/sessions/$LESSON/complete"; check "confirming twice is harmless" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
req aarav GET /credits; check "teacher is paid exactly once (11 + 2)" $([ "$(json 'j.balance===13 && j.earnedTeaching===5 && j.incoming===0')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.earnedTeaching,j.incoming])')"
req sara POST "/sessions/$LESSON/review" '{"rating":5}'; check "five-star review" $([ "$STATUS" = 201 ]; echo $?) "$STATUS $BODY"
req aarav GET /credits; check "five-star review bonus (+2)" $([ "$(json 'j.balance===15 && j.redeemable===5')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.redeemable])')"
req sara POST /sessions "{\"matchId\":\"$MATCH\",\"scheduledAt\":\"$WHEN2\",\"durationMinutes\":60,\"kind\":\"LESSON\"}"; LESSON2=$(json 'j.id')
req sara POST "/sessions/$LESSON2/cancel"; check "cancel a booked lesson" $([ "$(json 'j.status')" = CANCELLED ]; echo $?) "$STATUS $BODY"
req sara GET /credits; check "cancelled lesson is refunded in full" $([ "$(json 'j.balance===10 && j.held===0')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.held])')"

echo "rewards"
req aarav GET /rewards; check "rewards catalogue" $([ "$(json 'j.preview===true && j.catalog.length===4 && j.redeemable===5')" = true ]; echo $?) "$STATUS $BODY"
req sara POST /rewards/profile-spotlight/redeem; check "bonus credits cannot be redeemed (400)" $([ "$STATUS" = 400 ] && [ "$(json 'j.message.includes("teaching")')" = true ]; echo $?) "$STATUS $BODY"
req aarav POST /rewards/play-gift-code/redeem; check "cannot redeem more than is redeemable (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS $BODY"
req aarav POST /rewards/no-such-reward/redeem; check "unknown reward is 404" $([ "$STATUS" = 404 ]; echo $?) "$STATUS"
req aarav POST /rewards/profile-spotlight/redeem; check "redeem a reward -> PENDING" $([ "$STATUS" = 201 ] && [ "$(json 'j.status')" = PENDING ]; echo $?) "$STATUS $BODY"
REDEMPTION=$(json 'j.id')
req aarav GET /credits; check "redemption deducts credits (15 - 3)" $([ "$(json 'j.balance===12 && j.redeemable===2')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.redeemable])')"
req sara POST "/rewards/redemptions/$REDEMPTION/cancel"; check "cannot cancel someone else's redemption (404)" $([ "$STATUS" = 404 ]; echo $?) "$STATUS"
req aarav POST "/rewards/redemptions/$REDEMPTION/cancel"; check "cancel a pending redemption" $([ "$(json 'j.status')" = CANCELLED ]; echo $?) "$STATUS $BODY"
req aarav POST "/rewards/redemptions/$REDEMPTION/cancel"; check "cannot cancel twice (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req aarav GET /credits; check "cancelled redemption is refunded once" $([ "$(json 'j.balance===15 && j.redeemable===5 && j.transactions.reduce((s,t)=>s+t.amount,0)===15')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.redeemable])')"
# Under the demo domain so `npm run db:seed` cleans it up.
NEWBIE="smoke-$(date +%s)@demo.skillswap.test"
req newbie POST /auth/signup "{\"email\":\"$NEWBIE\",\"password\":\"$PW\",\"name\":\"Smoke Test\"}"; check "sign up" $([ "$STATUS" = 201 ]; echo $?) "$STATUS $BODY"
req newbie GET /credits; check "new members get the welcome bonus" $([ "$(json 'j.balance===8 && j.redeemable===0')" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.redeemable])')"

echo "password reset"
req anon POST /auth/forgot-password '{"email":"sara@demo.skillswap.test"}'; KNOWN="$STATUS $(json 'j.message')"
req anon POST /auth/forgot-password '{"email":"nobody-here@example.com"}'; UNKNOWN="$STATUS $(json 'j.message')"
check "forgot-password answers the same for known and unknown emails" $([ "$KNOWN" = "$UNKNOWN" ] && [ "$STATUS" = 200 ]; echo $?) "$KNOWN / $UNKNOWN"
req anon POST /auth/reset-password "{\"token\":\"$(printf 'ab%.0s' $(seq 1 32))\",\"password\":\"another-password\"}"
check "unknown reset token is rejected (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS $BODY"
req anon POST /auth/reset-password '{"token":"not-a-token","password":"another-password"}'
check "malformed reset token is rejected (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
login sara; check "requesting a reset does not lock the account" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"

echo "admin access"
req aarav GET /users/me; check "ADMIN_EMAILS member is flagged as admin" $([ "$(json 'j.isAdmin')" = true ]; echo $?) "$(json 'j.isAdmin')"
req sara GET /users/me; check "others are not admins" $([ "$(json 'j.isAdmin')" = false ]; echo $?)
req sara GET /admin/summary; check "non-admin gets 403 on /admin" $([ "$STATUS" = 403 ]; echo $?) "$STATUS"
req anon GET /admin/summary; check "signed-out gets 401 on /admin" $([ "$STATUS" = 401 ]; echo $?) "$STATUS"
req aarav GET /leaderboard
id_of() { json "j.find(u=>u.name===\"$1\").id"; }
ROHAN=$(id_of "Rohan Das"); DEV=$(id_of "Dev Patel"); MEERA=$(id_of "Meera Iyer"); KABIR=$(id_of "Kabir Singh"); AARAV_ID=$(id_of "Aarav Mehta")

echo "report"
req sara POST "/users/$ROHAN/report" '{"reason":"SPAM","details":"Smoke test report"}'; check "report a user" $([ "$STATUS" = 201 ] && [ "$(json 'j.status')" = OPEN ]; echo $?) "$STATUS $BODY"
REPORT=$(json 'j.id')
req sara POST "/users/$ROHAN/report" '{"reason":"RUDE"}'; check "unknown report reason is 400" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req sara GET /users/me; SARA_ID=$(json 'j.id')
req sara POST "/users/$SARA_ID/report" '{"reason":"OTHER"}'; check "cannot report yourself (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"

echo "block"
login meera; login dev
req dev GET /credits; DEV_BALANCE=$(json 'j.balance'); DEV_HELD=$(json 'j.held')
req meera POST "/users/$DEV/block"; check "block a connection" $([ "$STATUS" = 200 ]; echo $?) "$STATUS $BODY"
req dev GET /credits; check "upcoming lesson cancelled and learner refunded" $([ "$(json "j.balance===$DEV_BALANCE+$DEV_HELD && j.held===0")" = true ]; echo $?) "$(json 'JSON.stringify([j.balance,j.held])') was [$DEV_BALANCE,$DEV_HELD]"
req dev GET "/users/$MEERA"; check "blocked person sees 404 for the blocker" $([ "$STATUS" = 404 ]; echo $?) "$STATUS"
req meera GET "/users/$DEV"; check "blocker can still see the profile, marked blocked" $([ "$STATUS" = 200 ] && [ "$(json 'j.blockedByMe && j.connection===null')" = true ]; echo $?) "$STATUS"
req dev GET /matches; check "blocker hidden from the blocked person's Discover" $([ "$(json 'j.some(m=>m.name==="Meera Iyer")')" = false ]; echo $?)
req meera GET /matches; check "blocked person hidden from the blocker's Discover" $([ "$(json 'j.some(m=>m.name==="Dev Patel")')" = false ]; echo $?)
req dev POST "/matches/connect/$MEERA"; check "blocked person cannot reconnect (404)" $([ "$STATUS" = 404 ]; echo $?) "$STATUS"
req meera GET /matches/connections; check "connection ended" $([ "$(json 'j.some(c=>c.user.name==="Dev Patel")')" = false ]; echo $?)
req meera GET /blocks; check "blocked list" $([ "$(json 'j.length===1 && j[0].user.name==="Dev Patel"')" = true ]; echo $?) "$BODY"
req meera DELETE "/users/$DEV/block"; check "unblock" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
req dev GET "/users/$MEERA"; check "profile visible again after unblock" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"

echo "admin: reports"
req aarav GET /admin/summary; check "admin summary" $([ "$(json 'j.openReports>=1 && j.users>=8')" = true ]; echo $?) "$BODY"
req aarav GET /admin/reports; check "open reports include the new one" $([ "$(json "j.some(r=>r.id==='$REPORT' && r.reported.name==='Rohan Das' && r.reporter.name==='Sara Khan')")" = true ]; echo $?)
req aarav POST "/admin/reports/$REPORT/resolve" '{"status":"RESOLVED"}'; check "resolve a report" $([ "$(json 'j.status')" = RESOLVED ]; echo $?) "$STATUS $BODY"
req aarav POST "/admin/reports/$REPORT/resolve" '{"status":"DISMISSED"}'; check "cannot resolve twice (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"

echo "admin: rewards"
req aarav POST /rewards/profile-spotlight/redeem; R1=$(json 'j.id')
req aarav POST "/admin/redemptions/$R1/reject"; check "admin rejects a request" $([ "$(json 'j.status')" = CANCELLED ]; echo $?) "$STATUS $BODY"
req aarav GET /credits; check "rejected request is refunded" $([ "$(json 'j.redeemable')" = 5 ]; echo $?) "$(json 'j.redeemable')"
req aarav POST /rewards/profile-spotlight/redeem; R2=$(json 'j.id')
req aarav GET /admin/redemptions; check "pending requests listed with member" $([ "$(json "j.some(r=>r.id==='$R2' && r.user.name==='Aarav Mehta')")" = true ]; echo $?)
req aarav POST "/admin/redemptions/$R2/fulfil" '{"note":"Spotlight starts Monday"}'; check "admin fulfils a request" $([ "$(json 'j.status')" = FULFILLED ]; echo $?) "$STATUS $BODY"
req aarav POST "/rewards/redemptions/$R2/cancel"; check "fulfilled request cannot be cancelled (400)" $([ "$STATUS" = 400 ]; echo $?) "$STATUS"
req aarav GET /rewards; check "member sees the fulfilment note" $([ "$(json "j.redemptions.find(r=>r.id==='$R2').note")" = "Spotlight starts Monday" ]; echo $?)

echo "admin: suspension"
login kabir; check "login kabir" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
req aarav POST "/admin/users/$KABIR/suspend"; check "suspend a user" $([ "$(json 'j.suspended')" = true ]; echo $?) "$STATUS $BODY"
login kabir; check "suspended user cannot sign in (403)" $([ "$STATUS" = 403 ]; echo $?) "$STATUS $BODY"
req kabir POST /auth/refresh; check "suspended user cannot refresh (401)" $([ "$STATUS" = 401 ]; echo $?) "$STATUS"
req sara GET /matches; check "suspended user hidden from Discover" $([ "$(json 'j.some(m=>m.name==="Kabir Singh")')" = false ]; echo $?)
req sara GET /leaderboard; check "suspended user hidden from leaderboard" $([ "$(json 'j.some(u=>u.name==="Kabir Singh")')" = false ]; echo $?)
req aarav POST "/admin/users/$AARAV_ID/suspend"; check "admins cannot be suspended (403)" $([ "$STATUS" = 403 ]; echo $?) "$STATUS"
req aarav GET "/admin/users?q=kabir"; check "admin user search" $([ "$(json 'j.length===1 && j[0].suspendedAt!==null')" = true ]; echo $?) "$BODY"
req aarav POST "/admin/users/$KABIR/unsuspend"; check "unsuspend" $([ "$(json 'j.suspended')" = false ]; echo $?)
login kabir; check "unsuspended user can sign in again" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"

echo "token refresh + logout"
OLD_REFRESH=$(grep jwt_refresh "$DIR/aarav.jar" | awk '{print $NF}')
sleep 1
req aarav POST /auth/refresh; check "refresh rotates tokens" $([ "$STATUS" = 200 ]; echo $?) "$STATUS $BODY"
NEW_REFRESH=$(grep jwt_refresh "$DIR/aarav.jar" | awk '{print $NF}')
check "refresh token actually changed" $([ "$OLD_REFRESH" != "$NEW_REFRESH" ]; echo $?)
TOK=$(curl -s -b "$DIR/aarav.jar" -c "$DIR/aarav.jar" "$API/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
JWT_COOKIE=$(grep -P "	jwt	" "$DIR/aarav.jar" | awk '{print $NF}')
CSRF_COOKIE=$(grep 'x-csrf-token' "$DIR/aarav.jar" | awk '{print $NF}')
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "X-CSRF-Token: $TOK" -H "Cookie: x-csrf-token=$CSRF_COOKIE; jwt=$JWT_COOKIE; jwt_refresh=$OLD_REFRESH" "$API/auth/refresh")
check "rotated-out refresh token is rejected (401)" $([ "$STATUS" = 401 ]; echo $?) "$STATUS"
req aarav GET /users/me; check "session still valid after refresh" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
req aarav POST /auth/logout; check "logout" $([ "$STATUS" = 200 ]; echo $?) "$STATUS"
req aarav GET /users/me; check "401 after logout" $([ "$STATUS" = 401 ]; echo $?) "$STATUS"

echo
echo "passed: $pass  failed: $fail"
rm -rf "$DIR"
[ "$fail" = 0 ]

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Namespace, Socket } from 'socket.io';
import { parse as parseCookies } from 'cookie';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_COOKIE, allowedOrigins } from '../auth/cookie.config';
import type { JwtPayload } from '../auth/current-user.decorator';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TypingDto } from './dto/typing.dto';

interface SocketData {
  userId: string;
  userName: string;
  /** Matches this socket has been authorised for and joined. */
  matchIds: Set<string>;
}

type ChatSocket = Socket<any, any, any, SocketData>;

@WebSocketGateway({
  cors: {
    origin: allowedOrigins(),
    credentials: true,
  },
  namespace: '/chat',
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new WsException(
        errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join(', ') || 'Invalid message',
      ),
  }),
)
export class ChatGateway implements OnGatewayConnection, OnGatewayInit {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Namespace;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  afterInit(server: Namespace) {
    // Authenticate during the handshake, so no event handler can run before
    // socket.data is populated and bad tokens surface as connect_error.
    server.use((socket: ChatSocket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch(() => next(new Error('unauthorized')));
    });
  }

  handleConnection(socket: ChatSocket) {
    // `disconnecting` still has the socket's rooms; `disconnect` does not.
    socket.on('disconnecting', () => {
      for (const matchId of socket.data.matchIds ?? []) {
        void this.broadcastPresence(matchId, socket.id);
      }
    });
  }

  private async authenticate(socket: ChatSocket) {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = cookieHeader
      ? parseCookies(cookieHeader)[ACCESS_COOKIE]
      : undefined;
    if (!token) throw new Error('missing token');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: process.env.JWT_SECRET!,
    });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true },
    });
    if (!user) throw new Error('unknown user');

    socket.data.userId = user.id;
    socket.data.userName = user.name;
    socket.data.matchIds = new Set();
  }

  /** Tells everyone in the room who is currently connected to it. */
  private async broadcastPresence(matchId: string, excludeSocketId?: string) {
    const sockets = await this.server.in(matchId).fetchSockets();
    const online = new Map<string, string>();
    for (const member of sockets) {
      if (member.id === excludeSocketId) continue;
      const data = member.data as SocketData;
      online.set(data.userId, data.userName);
    }
    this.server.to(matchId).emit('presence', {
      onlineUsers: [...online].map(([id, name]) => ({ id, name })),
    });
  }

  private assertJoined(socket: ChatSocket, matchId: string) {
    if (!socket.data.matchIds.has(matchId)) {
      throw new WsException('Join the chat room before sending to it');
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: JoinRoomDto,
  ) {
    const { userId } = socket.data;
    const match = await this.prisma.match.findUnique({
      where: { id: payload.matchId },
      select: { userAId: true, userBId: true, status: true },
    });
    if (
      !match ||
      (match.userAId !== userId && match.userBId !== userId) ||
      match.status !== 'ACCEPTED'
    ) {
      throw new WsException('You do not have access to this chat');
    }

    await socket.join(payload.matchId);
    socket.data.matchIds.add(payload.matchId);
    await this.broadcastPresence(payload.matchId);
    return { joined: true };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: SendMessageDto,
  ) {
    this.assertJoined(socket, payload.matchId);

    const message = await this.prisma.message.create({
      data: {
        matchId: payload.matchId,
        senderId: socket.data.userId,
        content: payload.content,
      },
      select: {
        id: true,
        matchId: true,
        senderId: true,
        content: true,
        createdAt: true,
      },
    });

    this.server.to(payload.matchId).emit('receive_message', {
      ...message,
      senderName: socket.data.userName,
    });
    return { sent: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: TypingDto,
  ) {
    this.assertJoined(socket, payload.matchId);

    // Everyone in the room except the person typing.
    socket.to(payload.matchId).emit('typing', {
      userId: socket.data.userId,
      name: socket.data.userName,
      isTyping: payload.isTyping,
    });
  }
}

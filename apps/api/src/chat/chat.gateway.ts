import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TypingDto } from './dto/typing.dto';
import { parse as parseCookies } from 'cookie';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketUserMap = new Map<string, string>();

  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    const token = this.extractJwtFromSocket(socket);
    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET!,
      });
      this.socketUserMap.set(socket.id, payload.sub);
      socket.data.userId = payload.sub;
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = this.socketUserMap.get(socket.id);
    if (userId) {
      this.socketUserMap.delete(socket.id);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinRoomDto,
  ) {
    const userId = socket.data.userId as string;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const match = await this.prisma.match.findUnique({ where: { id: payload.matchId } });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new UnauthorizedException();
    }

    socket.join(payload.matchId);
    const members = this.server.sockets.adapter.rooms.get(payload.matchId) ?? new Set();
    const onlineUsers = Array.from(members)
      .map((socketId) => this.socketUserMap.get(socketId))
      .filter(Boolean);
    this.server.to(payload.matchId).emit('presence', { onlineUsers });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const userId = socket.data.userId as string;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const match = await this.prisma.match.findUnique({ where: { id: payload.matchId } });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new UnauthorizedException();
    }

    const message = await this.prisma.message.create({
      data: {
        matchId: payload.matchId,
        senderId: userId,
        content: payload.content,
      },
      include: { sender: true },
    });

    type ChatMessageResponse = Prisma.MessageGetPayload<{ include: { sender: true } }>;
    const typedMessage = message as ChatMessageResponse;

    const sanitizedMessage = {
      id: typedMessage.id,
      matchId: typedMessage.matchId,
      senderId: typedMessage.senderId,
      senderName: typedMessage.sender.name,
      content: typedMessage.content,
      createdAt: typedMessage.createdAt,
    };

    this.server.to(payload.matchId).emit('receive_message', sanitizedMessage);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: TypingDto,
  ) {
    const userId = socket.data.userId as string;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const match = await this.prisma.match.findUnique({ where: { id: payload.matchId } });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new UnauthorizedException();
    }

    this.server.to(payload.matchId).emit('typing', {
      userId,
      isTyping: payload.isTyping,
    });
  }

  /**
   * Extracts the JWT access token from the socket's cookie header.
   * Uses the `cookie` package's parse() to correctly handle Base64-encoded
   * values that contain '=' padding characters (avoids the truncation bug
   * caused by naively splitting on '=').
   */
  private extractJwtFromSocket(socket: Socket): string | undefined {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return undefined;
    const cookies = parseCookies(cookieHeader);
    return cookies['jwt'];
  }
}

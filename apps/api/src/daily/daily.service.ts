import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

interface DailyRoomResponse {
  room?: {
    name: string;
    url: string;
    id: string;
  };
  error?: string;
}

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private readonly apiKey = process.env.DAILY_API_KEY;
  private readonly apiUrl = 'https://api.daily.co/v1/rooms';

  async createRoom(sessionId: string, matchId: string, userNames: string[]): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn('DAILY_API_KEY not configured, skipping Daily room creation');
      return null;
    }

    try {
      const roomName = `skillswap-${sessionId}`.toLowerCase();
      const response = await axios.post<DailyRoomResponse>(
        this.apiUrl,
        {
          name: roomName,
          properties: {
            enable_knock: false,
            enable_screenshare: true,
            enable_chat: true,
            max_participants: 2,
            meeting_join_hook: {
              urls: [`${process.env.BACKEND_URL || 'http://localhost:3001'}/daily/webhooks/join`],
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const roomUrl = response.data.room?.url;
      if (!roomUrl) {
        this.logger.error('Daily room created but no URL returned', response.data);
        return null;
      }

      this.logger.log(`Daily room created: ${roomName} -> ${roomUrl}`);
      return roomUrl;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to create Daily room: ${axiosError.message}`,
        axiosError.response?.data,
      );
      return null;
    }
  }

  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await axios.delete(`${this.apiUrl}/${roomName}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      this.logger.log(`Daily room deleted: ${roomName}`);
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to delete Daily room: ${axiosError.message}`,
        axiosError.response?.data,
      );
      return false;
    }
  }
}

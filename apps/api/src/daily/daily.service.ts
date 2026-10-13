import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

// https://docs.daily.co/reference/rest-api/rooms/create-room
interface DailyRoom {
  id: string;
  name: string;
  url: string;
}

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private readonly apiUrl = 'https://api.daily.co/v1/rooms';

  private get apiKey() {
    return process.env.DAILY_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  static roomName(sessionId: string) {
    return `skillswap-${sessionId}`.toLowerCase();
  }

  /**
   * Creates an unlisted 1:1 room that expires an hour after the session
   * ends. Returns null when Daily is not configured or the call fails.
   */
  async createRoom(sessionId: string, endsAt: Date): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const roomName = DailyService.roomName(sessionId);
      const response = await axios.post<DailyRoom>(
        this.apiUrl,
        {
          name: roomName,
          properties: {
            enable_knock: false,
            enable_screenshare: true,
            enable_chat: true,
            max_participants: 2,
            exp: Math.floor(endsAt.getTime() / 1000) + 60 * 60,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const roomUrl = response.data.url;
      if (!roomUrl) {
        this.logger.error('Daily room created but no URL returned');
        return null;
      }

      this.logger.log(`Daily room created: ${roomName}`);
      return roomUrl;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to create Daily room: ${axiosError.message}`,
        JSON.stringify(axiosError.response?.data ?? {}),
      );
      return null;
    }
  }

  async deleteRoom(sessionId: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    const roomName = DailyService.roomName(sessionId);
    try {
      await axios.delete(`${this.apiUrl}/${roomName}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 10000,
      });
      this.logger.log(`Daily room deleted: ${roomName}`);
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to delete Daily room ${roomName}: ${(error as AxiosError).message}`,
      );
      return false;
    }
  }
}

import axios from 'axios';

type ApiErrorResponse = {
  message?: string | string[];
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  const message = error.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return message || fallback;
}

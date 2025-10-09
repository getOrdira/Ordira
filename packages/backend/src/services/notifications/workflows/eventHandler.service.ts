import { triggersService } from '../features/triggers.service';
import { NotificationEvent } from '../types/notificationEvent';

export class EventHandlerService {
  async handle(event: NotificationEvent): Promise<void> {
    await triggersService.handle(event);
  }
}

export const eventHandlerService = new EventHandlerService();

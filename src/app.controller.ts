import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async start(): Promise<string> {
    await this.appService.start();
    return 'Done';
  }
}

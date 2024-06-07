import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
    setTimeout(() => {
      this.appService.start();
    }, 3000);
  }

  @Get()
  async start(): Promise<string> {
    await this.appService.start();
    return 'Done';
  }
}

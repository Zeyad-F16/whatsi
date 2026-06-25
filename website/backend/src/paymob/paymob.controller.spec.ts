import { Test, TestingModule } from '@nestjs/testing';
import { PaymobController } from './paymob.controller';

describe('PaymobController', () => {
  let controller: PaymobController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymobController],
    }).compile();

    controller = module.get<PaymobController>(PaymobController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

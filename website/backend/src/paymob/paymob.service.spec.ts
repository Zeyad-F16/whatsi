import { Test, TestingModule } from '@nestjs/testing';
import { PaymobService } from './paymob.service';

describe('PaymobService', () => {
  let service: PaymobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymobService],
    }).compile();

    service = module.get<PaymobService>(PaymobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

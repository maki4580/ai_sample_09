import { PrismaClient } from '@prisma/client';
import { productRepository } from '../productRepository';

interface MockPrismaClient {
  product: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    createMany: jest.Mock;
  };
  $transaction: jest.Mock<Promise<void>>;
}

// Prismaクライアントのモック
const mockPrisma: MockPrismaClient = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (callback) => await callback(mockPrisma)),
};

// PrismaClientのモックを設定
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

describe('ProductRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('全ての商品を取得できること', async () => {
      const mockProducts = [
        {
          id: 1,
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await productRepository.findAll();

      expect(result).toEqual(mockProducts);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        orderBy: { productCode: 'asc' },
      });
    });
  });

  describe('findByCode', () => {
    it('商品コードで商品を検索できること', async () => {
      const mockProduct = {
        id: 1,
        productCode: 'TEST001',
        productName: 'テスト商品1',
        demandCount: 100,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await productRepository.findByCode('TEST001');

      expect(result).toEqual(mockProduct);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { productCode: 'TEST001' },
      });
    });

    it('存在しない商品コードの場合にnullを返すこと', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await productRepository.findByCode('NOTEXIST');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('新規商品を作成できること', async () => {
      const mockProduct = {
        id: 1,
        productCode: 'TEST001',
        productName: 'テスト商品1',
        demandCount: 100,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createData = {
        productCode: 'TEST001',
        productName: 'テスト商品1',
        demandCount: 100,
      };

      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await productRepository.create(createData);

      expect(result).toEqual(mockProduct);
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          version: 1,
        },
      });
    });
  });

  describe('update', () => {
    it('商品を更新できること', async () => {
      const mockProduct = {
        id: 1,
        productCode: 'TEST001',
        productName: '更新商品1',
        demandCount: 200,
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        productCode: 'TEST001',
        productName: '更新商品1',
        demandCount: 200,
        version: 1,
      };

      mockPrisma.product.update.mockResolvedValue(mockProduct);

      const result = await productRepository.update('TEST001', updateData);

      expect(result).toEqual(mockProduct);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { productCode: 'TEST001' },
        data: {
          ...updateData,
          version: 2,
        },
      });
    });
  });

  describe('createMany', () => {
    it('複数の商品を一括作成できること', async () => {
      const createData = [
        {
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
        },
        {
          productCode: 'TEST002',
          productName: 'テスト商品2',
          demandCount: 200,
        },
      ];

      mockPrisma.product.createMany.mockResolvedValue({ count: 2 });

      await productRepository.createMany(createData);

      expect(mockPrisma.product.createMany).toHaveBeenCalledWith({
        data: createData.map(item => ({
          ...item,
          version: 1,
        })),
      });
    });
  });

  describe('updateMany', () => {
    it('複数の商品を一括更新できること', async () => {
      const updateData = [
        {
          productCode: 'TEST001',
          productName: '更新商品1',
          demandCount: 200,
          version: 1,
        },
        {
          productCode: 'TEST002',
          productName: '更新商品2',
          demandCount: 300,
          version: 1,
        },
      ];

      mockPrisma.product.update.mockResolvedValue({});

      await productRepository.updateMany(updateData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.product.update).toHaveBeenCalledTimes(2);
    });
  });
});

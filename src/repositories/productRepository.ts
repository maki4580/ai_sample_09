import { PrismaClient, Product } from '@prisma/client';

const prisma = new PrismaClient();

export interface IProductCreate {
  productCode: string;
  productName: string;
  demandCount: number;
}

export interface IProductUpdate extends IProductCreate {
  version: number;
}

export class ProductRepository {
  async findAll(): Promise<Product[]> {
    return await prisma.product.findMany({
      orderBy: { productCode: 'asc' }
    });
  }

  async findByCode(productCode: string): Promise<Product | null> {
    return await prisma.product.findUnique({
      where: { productCode }
    });
  }

  async create(data: IProductCreate): Promise<Product> {
    return await prisma.product.create({
      data: {
        ...data,
        version: 1
      }
    });
  }

  async update(productCode: string, data: IProductUpdate): Promise<Product> {
    return await prisma.product.update({
      where: { productCode },
      data: {
        ...data,
        version: data.version + 1
      }
    });
  }

  async createMany(data: IProductCreate[]): Promise<void> {
    await prisma.product.createMany({
      data: data.map(item => ({
        ...item,
        version: 1
      }))
    });
  }

  async updateMany(data: IProductUpdate[]): Promise<void> {
    // トランザクションを使用して一括更新
    await prisma.$transaction(async (tx) => {
      for (const item of data) {
        await tx.product.update({
          where: { productCode: item.productCode },
          data: {
            ...item,
            version: item.version + 1
          }
        });
      }
    });
  }
}

export const productRepository = new ProductRepository();

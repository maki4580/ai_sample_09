import { Workbook, Worksheet, Row } from 'exceljs';
import { z } from 'zod';
import { productRepository, IProductCreate, IProductUpdate } from '../repositories/productRepository';

const TEMPLATE_PATH = './templates/product_template.xlsx';
const SHEET_PASSWORD = process.env.SHEET_PASSWORD || 'ExcelProtection2024';

// バリデーションスキーマ
const ProductSchema = z.object({
  productCode: z.string().min(1).max(50),
  productName: z.string().min(1).max(100),
  demandCount: z.number().int().positive(),
  version: z.number().int().optional()
});

type ProductData = z.infer<typeof ProductSchema>;

export class ProductService {
  private async validateExcelProtection(worksheet: Worksheet): Promise<boolean> {
    try {
      // @ts-ignore - ExcelJSの型定義の問題を回避
      return worksheet.protected === true;
    } catch {
      return false;
    }
  }

  private async validateExcelData(data: Partial<ProductData>[]): Promise<ProductData[]> {
    return await Promise.all(
      data.map(async (row) => {
        try {
          return await ProductSchema.parseAsync(row);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error(`バリデーションエラー: ${error.errors.map(e => e.message).join(', ')}`);
          }
          throw error;
        }
      })
    );
  }

  async createTemplate(): Promise<Workbook> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // ヘッダーの設定
    worksheet.columns = [
      { header: 'Version', key: 'version', width: 10 },
      { header: '商品コード', key: 'productCode', width: 15 },
      { header: '商品名', key: 'productName', width: 30 },
      { header: '需要数', key: 'demandCount', width: 10 }
    ];

    // シートの保護
    await worksheet.protect(SHEET_PASSWORD, {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertColumns: false,
      insertRows: false,
      insertHyperlinks: false,
      deleteColumns: false,
      deleteRows: false,
      sort: false,
      autoFilter: false,
      pivotTables: false
    });

    return workbook;
  }

  async exportToExcel(data: ProductData[]): Promise<Workbook> {
    const workbook = await this.createTemplate();
    const worksheet = workbook.getWorksheet('Products');

    if (!worksheet) {
      throw new Error('ワークシートの作成に失敗しました');
    }

    // データの追加
    data.forEach(item => {
      worksheet.addRow({
        version: item.version,
        productCode: item.productCode,
        productName: item.productName,
        demandCount: item.demandCount
      });
    });

    return workbook;
  }

  async processExcelFile(workbook: Workbook): Promise<ProductData[]> {
    const worksheet = workbook.getWorksheet('Products');

    if (!worksheet) {
      throw new Error('ワークシートが見つかりません');
    }

    if (!await this.validateExcelProtection(worksheet)) {
      throw new Error('シートが保護されていません');
    }

    const data: Partial<ProductData>[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row: Row, rowNumber: number) => {
      if (rowNumber > 1) { // ヘッダーをスキップ
        const values = row.values as any[];
        if (values.length >= 5) { // インデックス1から始まるため、5以上必要
          data.push({
            version: Number(values[1]),
            productCode: String(values[2]),
            productName: String(values[3]),
            demandCount: Number(values[4])
          });
        }
      }
    });

    return await this.validateExcelData(data);
  }

  async updateProducts(data: ProductData[]): Promise<void> {
    const existing = await productRepository.findAll();
    const existingMap = new Map(existing.map(p => [p.productCode, p]));

    const toCreate: IProductCreate[] = [];
    const toUpdate: IProductUpdate[] = [];

    for (const item of data) {
      const existingProduct = existingMap.get(item.productCode);

      if (!existingProduct) {
        toCreate.push(item);
      } else if (existingProduct.version === item.version) {
        toUpdate.push({ ...item, version: existingProduct.version });
      } else {
        throw new Error(`商品コード ${item.productCode} のバージョンが一致しません`);
      }
    }

    if (toCreate.length > 0) {
      await productRepository.createMany(toCreate);
    }
    if (toUpdate.length > 0) {
      await productRepository.updateMany(toUpdate);
    }
  }
}

export const productService = new ProductService();

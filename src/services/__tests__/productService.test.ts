import { Workbook } from 'exceljs';
import { productService } from '../productService';
import { productRepository } from '@/repositories/productRepository';

jest.mock('@/repositories/productRepository');
jest.mock('exceljs');

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('Excelテンプレートを正常に作成できること', async () => {
      const mockWorksheet = {
        columns: jest.fn(),
        protect: jest.fn().mockResolvedValue(undefined)
      };

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet)
      };

      (Workbook as jest.Mock).mockImplementation(() => mockWorkbook);

      const workbook = await productService.createTemplate();

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Products');
      expect(mockWorksheet.protect).toHaveBeenCalled();
    });
  });

  describe('processExcelFile', () => {
    it('保護されていないシートの場合にエラーを投げること', async () => {
      const mockRows: any[] = [];
      const mockWorksheet = {
        protected: false,
        eachRow: jest.fn().mockImplementation((options: any, callback: any) => {
          mockRows.forEach((row, index) => callback(row, index + 1));
        })
      };

      const mockWorkbook = {
        getWorksheet: jest.fn().mockReturnValue(mockWorksheet)
      };

      await expect(productService.processExcelFile(mockWorkbook as any))
        .rejects
        .toThrow('シートが保護されていません');
    });

    it('正常なExcelデータを処理できること', async () => {
      const mockRows = [
        { values: [null, null, null, null, null] }, // ヘッダー行
        { values: [null, 1, 'TEST001', 'テスト商品1', 100] } // データ行
      ];

      const mockWorksheet = {
        protected: true,
        eachRow: jest.fn().mockImplementation((options: any, callback: any) => {
          mockRows.forEach((row, index) => callback(row, index + 1));
        })
      };

      const mockWorkbook = {
        getWorksheet: jest.fn().mockReturnValue(mockWorksheet)
      };

      const result = await productService.processExcelFile(mockWorkbook as any);

      expect(result).toEqual([
        {
          version: 1,
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100
        }
      ]);
    });

    it('バリデーションエラーの場合にエラーを投げること', async () => {
      const mockRows = [
        { values: [null, null, null, null, null] }, // ヘッダー行
        { values: [null, 1, '', 'テスト商品1', -100] } // 不正なデータ行
      ];

      const mockWorksheet = {
        protected: true,
        eachRow: jest.fn().mockImplementation((options: any, callback: any) => {
          mockRows.forEach((row, index) => callback(row, index + 1));
        })
      };

      const mockWorkbook = {
        getWorksheet: jest.fn().mockReturnValue(mockWorksheet)
      };

      await expect(productService.processExcelFile(mockWorkbook as any))
        .rejects
        .toThrow('バリデーションエラー');
    });
  });

  describe('updateProducts', () => {
    it('新規商品を正常に作成できること', async () => {
      const mockData = [
        {
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
          version: 1
        }
      ];

      (productRepository.findAll as jest.Mock).mockResolvedValue([]);
      (productRepository.createMany as jest.Mock).mockResolvedValue(undefined);

      await productService.updateProducts(mockData);

      expect(productRepository.createMany).toHaveBeenCalledWith(mockData);
    });

    it('既存商品を正常に更新できること', async () => {
      const mockData = [
        {
          productCode: 'TEST001',
          productName: '更新商品1',
          demandCount: 200,
          version: 1
        }
      ];

      const existingProducts = [
        {
          id: 1,
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (productRepository.findAll as jest.Mock).mockResolvedValue(existingProducts);
      (productRepository.updateMany as jest.Mock).mockResolvedValue(undefined);

      await productService.updateProducts(mockData);

      expect(productRepository.updateMany).toHaveBeenCalledWith(mockData);
    });

    it('バージョン不一致の場合にエラーを投げること', async () => {
      const mockData = [
        {
          productCode: 'TEST001',
          productName: '更新商品1',
          demandCount: 200,
          version: 1
        }
      ];

      const existingProducts = [
        {
          id: 1,
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
          version: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (productRepository.findAll as jest.Mock).mockResolvedValue(existingProducts);

      await expect(productService.updateProducts(mockData))
        .rejects
        .toThrow('商品コード TEST001 のバージョンが一致しません');
    });
  });
});

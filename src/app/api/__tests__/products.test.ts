import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT } from '../products/route';
import { productService } from '@/services/productService';
import { productRepository } from '@/repositories/productRepository';
import { Workbook } from 'exceljs';

jest.mock('@/services/productService');
jest.mock('@/repositories/productRepository');
jest.mock('exceljs');

describe('Products API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('正常にExcelファイルをエクスポートできること', async () => {
      const mockProducts = [
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

      const mockWorkbook = {
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('test'))
        }
      };

      (productRepository.findAll as jest.Mock).mockResolvedValue(mockProducts);
      (productService.exportToExcel as jest.Mock).mockResolvedValue(mockWorkbook);

      const response = await GET();
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('エラー時に500エラーを返すこと', async () => {
      (productRepository.findAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('商品データのエクスポートに失敗しました');
    });
  });

  describe('POST /api/products', () => {
    it('正常にExcelファイルを処理できること', async () => {
      const mockData = [
        {
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
          version: 1
        }
      ];

      const mockFormData = new FormData();
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockFormData.append('file', mockFile);

      const mockWorkbook = new Workbook();
      (Workbook as jest.Mock).mockImplementation(() => mockWorkbook);
      (productService.processExcelFile as jest.Mock).mockResolvedValue(mockData);

      const request = new NextRequest(new URL('http://localhost/api/products'), {
        method: 'POST',
        body: mockFormData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data).toEqual(mockData);
    });

    it('ファイルが選択されていない場合に400エラーを返すこと', async () => {
      const mockFormData = new FormData();
      const request = new NextRequest(new URL('http://localhost/api/products'), {
        method: 'POST',
        body: mockFormData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('ファイルが選択されていません');
    });

    it('不正なファイル形式の場合に400エラーを返すこと', async () => {
      const mockFormData = new FormData();
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      mockFormData.append('file', mockFile);

      const request = new NextRequest(new URL('http://localhost/api/products'), {
        method: 'POST',
        body: mockFormData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Excelファイル(.xlsx)のみアップロード可能です');
    });
  });

  describe('PUT /api/products', () => {
    it('正常にデータを更新できること', async () => {
      const mockData = [
        {
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
          version: 1
        }
      ];

      const request = new NextRequest(new URL('http://localhost/api/products'), {
        method: 'PUT',
        body: JSON.stringify(mockData)
      });

      const response = await PUT(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('商品データが更新されました');
    });

    it('バージョン不一致の場合にエラーを返すこと', async () => {
      const mockData = [
        {
          productCode: 'TEST001',
          productName: 'テスト商品1',
          demandCount: 100,
          version: 1
        }
      ];

      (productService.updateProducts as jest.Mock).mockRejectedValue(
        new Error('商品コード TEST001 のバージョンが一致しません')
      );

      const request = new NextRequest(new URL('http://localhost/api/products'), {
        method: 'PUT',
        body: JSON.stringify(mockData)
      });

      const response = await PUT(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('商品コード TEST001 のバージョンが一致しません');
    });
  });
});

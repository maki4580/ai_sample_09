import { NextRequest, NextResponse } from 'next/server';
import { Workbook } from 'exceljs';
import { productService } from '@/services/productService';
import { productRepository } from '@/repositories/productRepository';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = './uploads';
const TMP_DIR = './tmp';

export async function GET() {
  try {
    const products = await productRepository.findAll();
    const workbook = await productService.exportToExcel(products);

    // バッファとしてExcelファイルを保存
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="products.xlsx"'
      }
    });
  } catch (error) {
    console.error('商品データのエクスポート中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: '商品データのエクスポートに失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Excelファイル(.xlsx)のみアップロード可能です' },
        { status: 400 }
      );
    }

    // tmpディレクトリにファイルを保存
    const tempFilePath = path.join(TMP_DIR, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    // Excelファイルを読み込み
    const workbook = new Workbook();
    await workbook.xlsx.readFile(tempFilePath);

    // Excelデータの処理
    const data = await productService.processExcelFile(workbook);

    // 一時ファイルの削除
    await fs.unlink(tempFilePath);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('ファイル処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ファイルの処理に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    await productService.updateProducts(data);
    return NextResponse.json({ message: '商品データが更新されました' });
  } catch (error) {
    console.error('商品データの更新中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '商品データの更新に失敗しました' },
      { status: 500 }
    );
  }
}

'use client';

import { useState } from 'react';

interface Product {
  productCode: string;
  productName: string;
  demandCount: number;
  version: number;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('ダウンロードに失敗しました');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(error instanceof Error ? error.message : '予期せぬエラーが発生しました');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('');
      setMessage('');
      setProducts([]);

      const file = event.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'アップロードに失敗しました');
      }

      setProducts(result.data);
      setMessage('ファイルが正常に処理されました。データを確認してください。');
    } catch (error) {
      setError(error instanceof Error ? error.message : '予期せぬエラーが発生しました');
    }
  };

  const handleRegister = async () => {
    try {
      setError('');
      setMessage('');

      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(products),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '登録に失敗しました');
      }

      setMessage('データが正常に登録されました');
      setProducts([]);
    } catch (error) {
      setError(error instanceof Error ? error.message : '予期せぬエラーが発生しました');
    }
  };

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">商品管理システム</h1>

      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Excel操作</h2>
          <div className="space-x-4">
            <button
              onClick={handleDownload}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              テンプレートダウンロード
            </button>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="border border-gray-300 p-2 rounded"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}

        {products.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">アップロードされたデータ</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2">商品コード</th>
                    <th className="border px-4 py-2">商品名</th>
                    <th className="border px-4 py-2">需要数</th>
                    <th className="border px-4 py-2">バージョン</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.productCode}>
                      <td className="border px-4 py-2">{product.productCode}</td>
                      <td className="border px-4 py-2">{product.productName}</td>
                      <td className="border px-4 py-2">{product.demandCount}</td>
                      <td className="border px-4 py-2">{product.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleRegister}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              データを登録
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

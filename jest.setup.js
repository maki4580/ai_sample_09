process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/product_db_test?schema=public";
process.env.SHEET_PASSWORD = "TestPassword123";

// FormDataのモック
global.FormData = class FormData {
  constructor() {
    this.data = new Map();
  }

  append(key, value) {
    this.data.set(key, value);
  }

  get(key) {
    return this.data.get(key);
  }
};

// Fileのモック
global.File = class File {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.type = options.type || '';
  }

  arrayBuffer() {
    return Promise.resolve(Buffer.from(this.bits));
  }
};

// Blobのモック
global.Blob = class Blob {
  constructor(content) {
    this.content = content;
  }
};

// URLのモック
global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn(),
};

// documentのモック
global.document = {
  createElement: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn(),
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

// matchMediaのモック
global.window = {
  URL: global.URL,
};

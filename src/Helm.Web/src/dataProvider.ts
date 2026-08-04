import type { DataProvider } from 'react-admin';

const noop = async () => Promise.reject(new Error('No resources configured yet.'));

export const dataProvider: DataProvider = {
  getList: noop,
  getOne: noop,
  getMany: noop,
  getManyReference: noop,
  create: noop,
  update: noop,
  updateMany: noop,
  delete: noop,
  deleteMany: noop,
};

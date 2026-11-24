
const userSorts = {
  alphabetical: { fullName: 1, _id: 1 },
  latest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 }
};

function userListOptions(values) {
  return {
    q: typeof values.q === 'string' ? values.q.trim().slice(0, 120) : '',
    status: ['active', 'inactive'].includes(values.status) ? values.status : 'all',
    sort: typeof values.sort === 'string' && Object.hasOwn(userSorts, values.sort) ? values.sort : 'latest',
    page: typeof values.page === 'string' && /^\d{1,9}$/.test(values.page) ? Math.max(1, Number(values.page)) : 1
  };
}

function userListUrl(options, overrides = {}) {
  return '/admin/users?' + new URLSearchParams({ ...options, ...overrides });
}
module.exports = { userSorts, userListOptions, userListUrl };

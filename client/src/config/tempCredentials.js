export const TEMP_LOGINS = {
  student: {
    email: 'student@nexgen.edu',
    password: 'student123',
    name: 'Alex Student',
  },
  staff: {
    email: 'staff@nexgen.edu',
    password: 'staff123',
    name: 'Jordan Staff',
  },
};

export function checkTempLogin(role, email, password) {
  const account = TEMP_LOGINS[role];
  if (!account) return false;
  return account.email === email && account.password === password;
}

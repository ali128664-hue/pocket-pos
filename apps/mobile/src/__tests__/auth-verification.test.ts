import { loginSchema, signUpSchema, forgotPasswordSchema } from '../utils/validation';
import { getFriendlyErrorMessage } from '../utils/errors';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting Phase 1 Authentication & Validation Test Suite...\n');

// 1. Test Login Validation
console.log('--- Test Group 1: Login Schema Validation ---');
{
  // Valid login
  const valid = loginSchema.safeParse({
    email: 'shopkeeper@example.com',
    password: 'password123',
  });
  assert(valid.success, 'Valid login should pass validation');

  // Invalid email
  const invalidEmail = loginSchema.safeParse({
    email: 'not-an-email',
    password: 'password123',
  });
  assert(!invalidEmail.success, 'Invalid email should fail');
  assert(
    invalidEmail.error?.issues[0]?.message === 'Please enter a valid email address',
    'Should have friendly email error message'
  );

  // Short password
  const shortPassword = loginSchema.safeParse({
    email: 'shop@test.com',
    password: '123',
  });
  assert(!shortPassword.success, 'Short password should fail');
  assert(
    shortPassword.error?.issues[0]?.message === 'Password must be at least 6 characters long',
    'Should have friendly password length error'
  );

  console.log('✅ Login schema tests passed');
}

// 2. Test Sign Up Validation
console.log('\n--- Test Group 2: Sign Up Schema Validation ---');
{
  // Valid signup with Pakistani phone
  const valid = signUpSchema.safeParse({
    fullName: 'Tariq Mehmood',
    phone: '03001234567',
    email: 'tariq@madinamart.pk',
    password: 'secretPassword123',
    confirmPassword: 'secretPassword123',
  });
  assert(valid.success, 'Valid signup should pass');

  // Valid signup with +92 format
  const validPlus92 = signUpSchema.safeParse({
    fullName: 'Tariq Mehmood',
    phone: '+923001234567',
    email: 'tariq@madinamart.pk',
    password: 'secretPassword123',
    confirmPassword: 'secretPassword123',
  });
  assert(validPlus92.success, 'Pakistani +92 phone format should pass');

  // Empty name
  const emptyName = signUpSchema.safeParse({
    fullName: '',
    phone: '03001234567',
    email: 'tariq@madinamart.pk',
    password: 'secretPassword123',
    confirmPassword: 'secretPassword123',
  });
  assert(!emptyName.success, 'Empty name should fail');

  // Invalid phone number format
  const invalidPhone = signUpSchema.safeParse({
    fullName: 'Ali Khan',
    phone: '123456',
    email: 'ali@test.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert(!invalidPhone.success, 'Invalid phone should fail');
  assert(
    Boolean(invalidPhone.error?.issues[0]?.message.includes('Pakistani mobile number')),
    'Should specify Pakistani phone format requirement'
  );

  // Password mismatch
  const mismatch = signUpSchema.safeParse({
    fullName: 'Ali Khan',
    phone: '03001234567',
    email: 'ali@test.com',
    password: 'password123',
    confirmPassword: 'differentPassword',
  });
  assert(!mismatch.success, 'Password mismatch should fail');
  assert(
    mismatch.error?.issues[0]?.message === 'Passwords do not match',
    'Should specify passwords do not match'
  );

  console.log('✅ Sign up schema tests passed');
}

// 3. Test Forgot Password Validation
console.log('\n--- Test Group 3: Forgot Password Schema Validation ---');
{
  const valid = forgotPasswordSchema.safeParse({ email: 'owner@shop.com' });
  assert(valid.success, 'Valid email should pass');

  const empty = forgotPasswordSchema.safeParse({ email: '' });
  assert(!empty.success, 'Empty email should fail');

  console.log('✅ Forgot password schema tests passed');
}

// 4. Test Error Message Mapping
console.log('\n--- Test Group 4: Friendly Error Messages ---');
{
  const invalidCreds = getFriendlyErrorMessage({ message: 'Invalid login credentials' });
  assert(
    invalidCreds.includes('Incorrect email or password'),
    'Should map invalid credentials to friendly message'
  );

  const userExists = getFriendlyErrorMessage({ message: 'User already registered' });
  assert(
    userExists.includes('already exists'),
    'Should map already registered error'
  );

  const networkErr = getFriendlyErrorMessage({ message: 'Network request failed' });
  assert(
    networkErr.includes('check your internet connection'),
    'Should map network error'
  );

  const fallback = getFriendlyErrorMessage({ message: 'Unknown server error' });
  assert(
    fallback === 'Unknown server error',
    'Should preserve server error if not specially mapped'
  );

  console.log('✅ Error message mapping tests passed');
}

console.log('\n🎉 ALL PHASE 1 AUTHENTICATION TESTS PASSED WITH 0 ERRORS!\n');

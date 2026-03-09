import SupabaseService from './src/services/SupabaseService';

async function createAccount() {
  try {
    console.log('Attempting to create account for sNumber 999999...');
    const sNumber = '999999';
    const password = 'Password123!'; // A strong dummy password
    const name = 'New Student 999999';
    const tshirtSize = 'L';

    const result = await SupabaseService.registerStudent(sNumber, password, name, tshirtSize);
    console.log('Account creation for 999999 result:', result);
  } catch (error) {
    console.error('Error creating account for sNumber 999999:', error);
  }
}

createAccount();

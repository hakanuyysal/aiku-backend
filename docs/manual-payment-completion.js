/**
 * MANUAL PAYMENT COMPLETION TOOL
 * ------------------------------
 * This script can be pasted into the browser console to manually
 * complete a 3D Secure payment if the automatic process fails.
 * 
 * How to use:
 * 1. After 3D authentication, if you're redirected to the callback page
 *    but the payment isn't completed
 * 2. Open browser developer tools (F12 or right-click > Inspect)
 * 3. Go to the Console tab
 * 4. Paste this entire script and press Enter
 * 5. Check the console logs for the result
 */

// Function to check localStorage values
function checkLocalStorage() {
  const ucdMD = localStorage.getItem('param_ucd_md');
  const islemId = localStorage.getItem('param_islem_id');
  const siparisId = localStorage.getItem('param_siparis_id');
  const authToken = localStorage.getItem('auth_token');
  
  console.log('LocalStorage Values:');
  console.log('- ucdMD:', ucdMD ? 'Found ✓' : 'MISSING ✗');
  console.log('- islemId:', islemId ? 'Found ✓' : 'MISSING ✗');
  console.log('- siparisId:', siparisId ? 'Found ✓' : 'MISSING ✗');
  console.log('- auth_token:', authToken ? 'Found ✓' : 'MISSING ✗');
  
  return { ucdMD, islemId, siparisId, authToken };
}

// Function to manually complete payment
async function manualCompletePayment() {
  console.log('------------------------------------');
  console.log('MANUAL PAYMENT COMPLETION TOOL');
  console.log('------------------------------------');
  
  const { ucdMD, islemId, siparisId, authToken } = checkLocalStorage();
  
  if (!ucdMD || !islemId || !siparisId) {
    console.error('❌ ERROR: Missing required payment data in localStorage');
    console.error('The payment cannot be completed without these values.');
    return false;
  }
  
  if (!authToken) {
    console.warn('⚠️ WARNING: No auth token found. Authentication might fail.');
  }
  
  try {
    console.log('Starting manual payment completion...');
    console.log('Calling /api/payments/complete-payment endpoint...');
    
    const response = await fetch('/api/payments/complete-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      },
      body: JSON.stringify({
        ucdMD,
        islemId,
        siparisId
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ PAYMENT COMPLETED SUCCESSFULLY!');
      console.log('Payment Result:', data);
      console.log('You can now navigate to: /payment/success');
      return true;
    } else {
      console.error('❌ Payment completion failed');
      console.error('Error Message:', data.message || 'Unknown error');
      console.error('Full Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Exception during payment completion:', error);
    return false;
  }
}

// Execute the manual payment completion
manualCompletePayment().then(success => {
  if (success) {
    console.log('------------------------------------');
    console.log('Would you like to navigate to the success page?');
    console.log('If yes, type: window.location.href = "/payment/success"');
  } else {
    console.log('------------------------------------');
    console.log('Troubleshooting tips:');
    console.log('1. Check the backend logs for any errors');
    console.log('2. Verify your authentication token is valid');
    console.log('3. Try again with a different payment method');
    console.log('4. Contact support with the error details above');
  }
}); 
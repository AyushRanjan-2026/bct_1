// Utility functions for storing and retrieving DIDs by wallet address and role

const STORAGE_KEY_PREFIX = 'mpa_did_';

/**
 * Store DID for a wallet address and role
 * @param {string} walletAddress - The wallet address
 * @param {string} role - The role (patient, insurer, provider)
 * @param {string} did - The DID to store
 */
export function storeDID(walletAddress, role, did) {
  if (!walletAddress || !did) {
    console.warn('Cannot store DID: missing walletAddress or did');
    return;
  }
  // Unified key - ignores role to share identity across all dashboards
  const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
  try {
    localStorage.setItem(key, did);
    console.log(`✅ Stored unified DID for ${walletAddress}`);
  } catch (error) {
    console.error('Error storing DID:', error);
  }
}

/**
 * Retrieve DID for a wallet address (unified across roles)
 * @param {string} walletAddress - The wallet address
 * @param {string} role - The role (ignored for unified identity)
 * @returns {string|null} The stored DID or null if not found
 */
export function getDID(walletAddress, role) {
  if (!walletAddress) {
    return null;
  }
  // Unified key - ignores role
  const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
  try {
    const did = localStorage.getItem(key);
    if (did) {
      console.log(`✅ Retrieved unified DID for ${walletAddress}`);
    }
    return did;
  } catch (error) {
    console.error('Error retrieving DID:', error);
    return null;
  }
}

/**
 * Remove DID for a wallet address (unified across roles)
 * @param {string} walletAddress - The wallet address
 * @param {string} role - The role (ignored for unified identity)
 */
export function removeDID(walletAddress, role) {
  if (!walletAddress) {
    return;
  }
  // Unified key - ignores role
  const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
  try {
    localStorage.removeItem(key);
    console.log(`✅ Removed unified DID for ${walletAddress}`);
  } catch (error) {
    console.error('Error removing DID:', error);
  }
}

/**
 * Clear all DIDs (useful for testing or reset)
 */
export function clearAllDIDs() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ Cleared all DIDs');
  } catch (error) {
    console.error('Error clearing DIDs:', error);
  }
}




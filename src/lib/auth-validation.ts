export const REQUIRED_DOMAIN = '@gprec.ac.in';

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEmail?: string;
  extractedRollNo?: string;
  department?: string;
}

/**
 * Validates organizational student/faculty email address.
 * Strictly enforces that the email belongs to G Pulla Reddy Engineering College (@gprec.ac.in).
 */
export function validateGprecEmail(rawEmail: string): EmailValidationResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { isValid: false, error: 'Email address is required.' };
  }

  const email = rawEmail.trim().toLowerCase();

  // Basic email structure regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address format.' };
  }

  // Check domain
  if (!email.endsWith(REQUIRED_DOMAIN)) {
    // Provide explicit contextual messages for common consumer domains
    const domainPart = email.split('@')[1];
    if (['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domainPart)) {
      return {
        isValid: false,
        error: `Personal email addresses (${domainPart}) are not permitted. Please use your official institutional email ending with @gprec.ac.in.`
      };
    }
    return {
      isValid: false,
      error: `Access restricted to G Pulla Reddy Engineering College. Only email addresses ending with ${REQUIRED_DOMAIN} are authorized.`
    };
  }

  const localPart = email.substring(0, email.length - REQUIRED_DOMAIN.length);
  if (!localPart || localPart.length < 2) {
    return { isValid: false, error: 'Invalid email username before @gprec.ac.in.' };
  }

  // Attempt to parse standard GPREC Roll Number pattern (e.g., 219X1A0523 or 229x1a0401)
  let extractedRollNo: string | undefined;
  let department: string | undefined;

  const rollMatch = localPart.match(/^([0-9]{2}[0-9a-z]{3}[0-9a-z]{5})/i);
  if (rollMatch) {
    extractedRollNo = rollMatch[1].toUpperCase();
    // GPREC Dept codes in roll numbers: 01=CE, 02=EEE, 03=ME, 04=ECE, 05=CSE, 12=IT, 32=CSBS, 33=AI&DS
    if (extractedRollNo.includes('1A05') || extractedRollNo.includes('5A05')) department = 'Computer Science & Engineering (CSE)';
    else if (extractedRollNo.includes('1A04') || extractedRollNo.includes('5A04')) department = 'Electronics & Communication (ECE)';
    else if (extractedRollNo.includes('1A02') || extractedRollNo.includes('5A02')) department = 'Electrical & Electronics (EEE)';
    else if (extractedRollNo.includes('1A03') || extractedRollNo.includes('5A03')) department = 'Mechanical Engineering (ME)';
    else if (extractedRollNo.includes('1A01') || extractedRollNo.includes('5A01')) department = 'Civil Engineering (CE)';
    else if (extractedRollNo.includes('1A33')) department = 'Artificial Intelligence & Data Science';
    else if (extractedRollNo.includes('1A32')) department = 'Computer Science & Business Systems';
    else department = 'Engineering';
  }

  return {
    isValid: true,
    normalizedEmail: email,
    extractedRollNo,
    department
  };
}

/**
 * Validates 6-digit numeric OTP code.
 */
export function validateOtpCode(code: string): { isValid: boolean; error?: string } {
  if (!code) {
    return { isValid: false, error: 'Verification code is required.' };
  }
  const clean = code.trim();
  if (!/^\d{6}$/.test(clean)) {
    return { isValid: false, error: 'Verification code must be exactly 6 numeric digits.' };
  }
  return { isValid: true };
}

/**
 * Validates student sign-in using a GPREC institutional email address.
 */
export function validateStudentGmailEmail(rawEmail: string): EmailValidationResult {
  return validateGprecEmail(rawEmail);
}


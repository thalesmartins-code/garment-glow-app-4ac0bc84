export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Mínimo de 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Pelo menos 1 letra maiúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Pelo menos 1 número");
  }

  const strength: PasswordValidation["strength"] =
    errors.length === 0 && password.length >= 12
      ? "strong"
      : errors.length === 0
        ? "medium"
        : "weak";

  return { isValid: errors.length === 0, errors, strength };
}

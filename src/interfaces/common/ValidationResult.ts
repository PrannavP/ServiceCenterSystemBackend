
export default interface ValidationResult {
    isValid: boolean;
    statusCode?: number;
    message?: string;
    errors?: string[];
}
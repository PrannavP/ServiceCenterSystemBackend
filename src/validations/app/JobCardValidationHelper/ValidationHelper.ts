import ValidationResult from "../../../interfaces/common/ValidationResult.js";
import { CreateUpdateJobCardDTO } from "../../../interfaces/app/job/jobcard.interface.js";

export async function validateJobCard(
    db: any,
    dto: CreateUpdateJobCardDTO,
    isForUpdate: boolean
): Promise<ValidationResult>{
    const errors: string[] = [];

    if(!dto.customer_name || dto.customer_name.trim().length < 2 || dto.customer_name.trim().length > 50){
        errors.push("Customer name must be between 2 and 50 characters.");
    }

    if(!dto.customer_address || dto.customer_address.trim().length < 2 || dto.customer_address.trim().length > 50){
        errors.push("Customer address must be between 2 and 50 characters.");
    }

    if(!dto.contact_number || dto.contact_number.trim().length !== 10){
        errors.push("Customer number must be exactly 10 digits.");
    }

    if(!dto.static_vehicle_type_id || dto.static_vehicle_type_id === 0){
        errors.push("Invalid vehicle type selected.");
    }

    if(!dto.static_vehicle_id || dto.static_vehicle_id === 0){
        errors.push("Invalid vehicle selected.");
    }

    if(!dto.vehicle_registration_number || dto.vehicle_registration_number.trim().length < 5 || dto.vehicle_registration_number.trim().length > 50){
        errors.push("Vehicle registration number must be between 5 to 50 characters.");
    }

    if(!dto.odometer_reading || dto.odometer_reading.trim().length === 0){
        errors.push("Odometer reading is required.");
    }

    if(!dto.fuel_quantity || dto.fuel_quantity.trim().length === 0){
        errors.push("Fuel quantity is required.");
    }

    if(!dto.chasis_number || dto.chasis_number.trim().length === 0){
        errors.push("Chasis number is required.");
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            statusCode: 409,
            errors
        };
    }

    return {
        isValid: true
    };
};
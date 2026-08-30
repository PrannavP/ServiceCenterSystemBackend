export interface CreateUpdateJobCardDTO{
    id?: number;
    customer_name: string;
    customer_address: string;
    contact_number: string;
    static_vehicle_type_id: number;
    static_vehicle_id: number;
    vehicle_registration_number: string;
    odometer_reading: string;
    fuel_quantity: string;
    chasis_number: string;
    problems?: string;
    remarks?: string;
    is_active: boolean;

    job_card_detail?: Array<JobCardDetailDTO> // can be null when first time creating a job card from scanning image, later user can update and parrts.
}

export interface JobCardDetailDTO{
    part_id: number;
    quantity: number;
    rate: number;
    total: number;
}

export interface JobCardSettlementDTO {
    from_app: Boolean,
    jobcard_id: Number,
    payment_method: String,
    card_number?: String,
    card_expiry_date?: Date,
    name_on_card?: String,
    settled_amount: number
};
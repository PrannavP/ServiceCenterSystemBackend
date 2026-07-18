export interface GetBillDTO {
    id: number;
}

export interface UpdateBillDTO {
    id: number;
    customer_name: string;
    customer_address: string;
    static_vehicle_type_id: number;
    static_vehicle_id: number;
    vehicle_number: string;
    payment_method: string;

    bill_detail: BillDetailDTO[];
}

export interface BillDTO {
    id?: number;
    jobcard_id: number;
    customer_name: string;
    customer_address: string;
    static_vehicle_type_id: number;
    static_vehicle_id: number;
    vehicle_number: string;
    payment_method?: string;

    bill_detail?: BillDetailDTO[];
}

export interface BillDetailDTO {
    item_name: string;
    quantity: number;
    rate: number;
    total: number;
    tax_percentage: number;
    tax_amount: number;
}

export interface CreateBillDTO {
    jobcard_id: number;
    payment_method: string;
}
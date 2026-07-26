export interface CreateUpdateReceiptDTO {
    id?: number;
    remarks?: string;
    number?:string;
    is_active: boolean;

    detail: Array<ReceiptDetail>; // we can use another interface here
};

interface ReceiptDetail{
    part_id: number;
    quantity: number;
    rate: number;
    total: number;
}
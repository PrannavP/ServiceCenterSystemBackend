export interface Part {
    id: number,
    name: string,
    number: string,
    is_active: boolean,
    is_deleted: boolean,
    created_by: number,
    created_date: string,
    updated_by: number,
    updated_date: string
}

export interface CreateUpdatePartDTO {
    id?: number;
    name: string;
    part_number: string;
    is_active: boolean
};
export interface CreateUpdateUserDTO{
    id?: number,
    username: string;
    email: string,
    password: string,
    full_name: string,
    phone: string,
    is_active: boolean,
    avatar_url?: string
};

export interface RegisterDTO {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}
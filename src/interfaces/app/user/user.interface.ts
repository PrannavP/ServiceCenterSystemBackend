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
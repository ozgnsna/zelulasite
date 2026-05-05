-- Profil: telefon (kayıt) + isteğe bağlı doğum günü (kampanya / sürpriz)
alter table public.profiles
  add column if not exists phone text,
  add column if not exists birth_date date;

comment on column public.profiles.phone is 'Kayıtta verilen telefon; sipariş ve iletişim.';
comment on column public.profiles.birth_date is 'İsteğe bağlı; doğum günü ayrıcalıkları ve kampanyalar için.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bd text;
  bd_parsed date;
begin
  bd := nullif(trim(new.raw_user_meta_data->>'birth_date'), '');
  bd_parsed := null;
  if bd is not null and bd ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      bd_parsed := bd::date;
    exception when others then
      bd_parsed := null;
    end;
  end if;

  insert into public.profiles (id, full_name, phone, birth_date)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    bd_parsed
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

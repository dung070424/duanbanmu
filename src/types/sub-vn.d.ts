declare module 'sub-vn/json_data/provinces.json' {
  interface Province {
    code: string;
    name: string;
  }
  const provinces: Province[];
  export default provinces;
}

declare module 'sub-vn/json_data/districts.json' {
  interface District {
    code: string;
    name: string;
    province_code: string;
  }
  const districts: District[];
  export default districts;
}

declare module 'sub-vn/json_data/wards.json' {
  interface Ward {
    code: string;
    name: string;
    district_code: string;
  }
  const wards: Ward[];
  export default wards;
}

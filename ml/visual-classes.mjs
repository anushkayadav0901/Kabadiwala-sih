// Visual classes deliberately collapse price-only variants (for example AC
// tonnage and coil metal) into one class. `catalogId` is used only when a
// prediction may safely preselect a catalogue item; appliance classes require
// the collector to select the precise paid variant.
export const visualClasses = [
  { id: "newspaper", label: "Newspaper", catalogId: "newspaper", terms: ["stack of newspapers", "waste newspaper"] },
  { id: "books", label: "Books", catalogId: "books", terms: ["used books stack", "old books"] },
  { id: "cardboard", label: "Cardboard", catalogId: "cardboard", terms: ["corrugated cardboard box", "cardboard recycling"] },
  { id: "magazine", label: "Magazine", catalogId: "magazine", terms: ["magazine stack", "magazine cover"] },
  { id: "hard_plastic", label: "Hard Plastic", catalogId: "hard_plastic", terms: ["plastic crate", "plastic bucket"] },
  { id: "soft_plastic_film", label: "Soft Plastic Film", catalogId: "soft_plastic_film", terms: ["plastic film packaging", "plastic bag waste"] },
  { id: "iron_scrap", label: "Iron Scrap", catalogId: "iron_scrap", terms: ["scrap iron", "iron scrap yard"] },
  { id: "stainless_steel", label: "Stainless Steel", catalogId: "stainless_steel", terms: ["stainless steel utensils", "stainless steel scrap"] },
  { id: "copper_scrap", label: "Copper Scrap", catalogId: "copper_scrap", terms: ["copper scrap", "copper metal recycling"] },
  { id: "aluminium_scrap", label: "Aluminium Scrap", catalogId: "aluminium_scrap", terms: ["aluminium scrap", "aluminium recycling"] },
  { id: "brass_scrap", label: "Brass Scrap", catalogId: "brass_scrap", terms: ["brass scrap", "brass utensils"] },

  { id: "ac", label: "AC", terms: ["window air conditioner", "split air conditioner outdoor unit"], manualVariant: true },
  { id: "refrigerator", label: "Refrigerator", terms: ["refrigerator appliance", "old refrigerator"] , manualVariant: true },
  { id: "washing_machine", label: "Washing Machine", terms: ["washing machine appliance"], manualVariant: true },
  { id: "microwave_oven", label: "Microwave Oven", terms: ["microwave oven appliance"], manualVariant: true },
  { id: "dishwasher", label: "Dishwasher", terms: ["dishwasher appliance"], manualVariant: true },
  { id: "geyser", label: "Geyser / Water Heater", terms: ["electric water heater geyser"], manualVariant: true },
  { id: "electric_fan", label: "Electric Fan", terms: ["electric fan appliance"], manualVariant: true },
  { id: "electric_motor", label: "Electric Motor", terms: ["electric motor scrap", "electric motor machine"], manualVariant: true },
  { id: "generator", label: "Generator", terms: ["portable electric generator"], manualVariant: true },
  { id: "air_cooler", label: "Air Cooler", terms: ["evaporative air cooler"], manualVariant: true },
  { id: "inverter", label: "Power Inverter", terms: ["power inverter battery"], manualVariant: true },
  { id: "treadmill", label: "Treadmill", terms: ["treadmill exercise machine"], manualVariant: true },

  { id: "laptop_screen", label: "Laptop Screen", catalogId: "laptop_screen", terms: ["laptop screen", "laptop computer display"] },
  { id: "desktop_cpu", label: "Desktop CPU", catalogId: "desktop_cpu", terms: ["desktop computer tower", "desktop cpu cabinet"] },
  { id: "crt_monitor", label: "CRT Monitor", catalogId: "crt_monitor", terms: ["CRT computer monitor"] },
  { id: "lcd_led_monitor", label: "LCD/LED Monitor", catalogId: "lcd_led_monitor", terms: ["LCD computer monitor", "LED computer monitor"] },
  { id: "crt_television", label: "CRT Television", catalogId: "crt_television", terms: ["CRT television"] },
  { id: "printer", label: "Printer", catalogId: "printer_scan", terms: ["computer printer"] },
  { id: "ups", label: "UPS", catalogId: "ups_e_waste", terms: ["uninterruptible power supply UPS"] },
  { id: "smartphone", label: "Smart Phone", catalogId: "smartphone_scrap", terms: ["smartphone mobile phone"] },
  { id: "basic_mobile_phone", label: "Basic Mobile Phone", catalogId: "basic_mobile_phone", terms: ["feature phone mobile phone"] },
  { id: "tablet", label: "Tablet", catalogId: "tablet_scrap", terms: ["tablet computer device"] },

  { id: "car", label: "Car", catalogId: "car_scrap_full", terms: ["scrap car", "car junkyard"] },
  { id: "scooter", label: "Scooter", catalogId: "scooter_scrap", terms: ["motor scooter vehicle"] },
  { id: "motorcycle", label: "Motorcycle", catalogId: "bike_motorcycle_scrap", terms: ["motorcycle vehicle"] },
  { id: "bicycle", label: "Bicycle", catalogId: "bicycle_scrap", terms: ["bicycle"] }
];

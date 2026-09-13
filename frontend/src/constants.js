export const services = [
  ['web-development', 'Web Development'],
  ['mobile-app-development', 'Mobile App Development'],
  ['ui-ux-design', 'UI / UX Design'],
  ['branding', 'Branding & Identity'],
  ['digital-marketing', 'Digital Marketing'],
  ['seo', 'SEO & Performance'],
  ['ecommerce', 'E-commerce Solutions'],
  ['custom-software', 'Custom Software'],
  ['other', 'Other / Not sure yet']
];

export function getServiceLabel(serviceValue) {
  const service = services.find((s) => s[0] === serviceValue);
  return service ? service[1] : serviceValue;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(d)) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
  return `${day} ${month} ${year}, ${strTime}`;
}

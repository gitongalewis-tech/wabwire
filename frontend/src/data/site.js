import { Code2, Plane, GraduationCap, PenTool } from 'lucide-react'

export const services = [
  { title: 'Digital & technology', slug: '/services/web-development', icon: Code2, label: 'Technology', description: 'Practical digital tools that help organisations show up, work better and grow.', bullets: ['Website design & development', 'Digital transformation', 'Business automation', 'Technology consulting'] },
  { title: 'Travel & lifestyle', slug: '/services/tourism', icon: Plane, label: 'Travel', description: 'Thoughtful travel planning and support, shaped around the people and places that matter.', bullets: ['Holiday and group travel planning', 'Flights & accommodation support', 'Corporate travel', 'Car hire and transfers'] },
  { title: 'Entrepreneurship & learning', slug: '/learning', icon: GraduationCap, label: 'Development', description: 'Useful knowledge and practical skills for people building businesses and careers.', bullets: ['Entrepreneurship training', 'Digital skills development', 'Sales & marketing', 'Leadership and personal growth'] },
  { title: 'Branding & creative', slug: '/services/graphic-design', icon: PenTool, label: 'Creative', description: 'Clear brand identities and creative materials that help businesses communicate with confidence.', bullets: ['Brand identity', 'Graphic design', 'Personal branding', 'Marketing materials'] },
]

export const servicePrices = {
  websites: [
    ['One-page landing page', 'KES 15,000–25,000'], ['Personal portfolio website', 'KES 20,000–35,000'], ['Business website (5–10 pages)', 'KES 35,000–80,000'], ['Corporate website', 'KES 80,000–180,000'], ['E-commerce website', 'KES 100,000–300,000'], ['Custom web application', 'KES 250,000–2,000,000+'],
  ],
  marketing: [['Social media account setup', 'KES 5,000–15,000'], ['Monthly social media management', 'KES 20,000–80,000'], ['Facebook/Instagram ads management', 'KES 15,000–60,000/month'], ['Google Ads management', 'KES 20,000–100,000/month'], ['Email marketing campaign', 'KES 10,000–50,000'], ['SEO campaign', 'KES 25,000–150,000/month']],
  design: [['Logo design', 'KES 10,000–50,000'], ['Brand identity package', 'KES 35,000–120,000'], ['Company profile design', 'KES 20,000–60,000'], ['Brochure design', 'KES 8,000–30,000'], ['Banner design', 'KES 5,000–20,000'], ['Flyer design', 'KES 3,000–10,000']],
  travel: [['Local travel planning', 'KES 3,000–15,000'], ['International travel planning', 'KES 10,000–50,000'], ['Visa assistance', 'KES 5,000–25,000 (excl. embassy fees)'], ['Flight booking service fee', 'KES 2,000–8,000'], ['Hotel booking service fee', 'KES 2,000–10,000'], ['Corporate travel management', 'From KES 50,000/month']],
}

export const values = [
  ['Innovation', 'Finding better ways to solve real problems.'], ['Integrity', 'Building trust through honesty and accountability.'], ['Excellence', 'Improving the quality of every service and interaction.'], ['Customer focus', 'Listening first, then shaping a solution around real needs.'], ['Growth mindset', 'Learning, adapting and getting better over time.'], ['Collaboration', 'Creating more value through thoughtful partnerships.'], ['Impact', 'Measuring success by the positive change we contribute.'],
]

import Link from "next/link";

export default function Footer() {
  const quickLinks = [
    { href: "/", label: "Home" },
    { href: "/rooms", label: "Rooms" },
    { href: "/booking", label: "Booking" },
    { href: "/contact", label: "Contact" },
  ];

  const services = [
    "24/7 Reception",
    "Room Service",
    "Concierge",
    "Spa & Wellness",
  ];

  const contactInfo = [
    "📍 123 Hotel Street, City",
    "📞 +1 (555) 123-4567",
    "✉️ info@hoteldemo.com",
  ];

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="text-xl font-bold">Hotel Demo</span>
            </div>
            <p className="text-gray-400">
              Experience luxury and comfort in the heart of the city
            </p>
          </div>
          <div>
            <h5 className="text-lg font-semibold mb-4">Quick Links</h5>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-lg font-semibold mb-4">Services</h5>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service} className="text-gray-400">
                  {service}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-lg font-semibold mb-4">Contact Info</h5>
            <ul className="space-y-2 text-gray-400">
              {contactInfo.map((info) => (
                <li key={info}>{info}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p>&copy; 2025 Hotel Demo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

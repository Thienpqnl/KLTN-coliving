'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [location, setLocation] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [roomType, setRoomType] = useState('Private Suite');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search:', { location, moveInDate, roomType });
  };

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Newsletter signup');
  };

  return (
    <>
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center px-8 h-20 max-w-screen-2xl mx-auto font-['Manrope'] tracking-tight">
          <div className="text-2xl font-bold tracking-tighter text-orange-900 dark:text-orange-100">
            The Curated Hearth
          </div>
          <div className="hidden md:flex items-center space-x-10">
            <a className="text-orange-700 dark:text-orange-400 font-semibold border-b-2 border-orange-500 transition-colors" href="#">
              Explore
            </a>
            <a className="text-slate-600 dark:text-slate-400 font-medium hover:text-orange-600 dark:hover:text-orange-300 transition-colors" href="#">
              Community
            </a>
            <a className="text-slate-600 dark:text-slate-400 font-medium hover:text-orange-600 dark:hover:text-orange-300 transition-colors" href="#">
              Stories
            </a>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/login" className="text-slate-600 dark:text-slate-400 font-medium hover:text-orange-600 transition-colors scale-95 duration-200 ease-in-out">
              Login
            </Link>
            <Link href="/register" className="bg-gradient-to-r from-orange-600 to-orange-400 text-white px-6 py-2.5 rounded-full font-label text-xs uppercase tracking-widest font-bold shadow-lg shadow-orange-500/20 scale-95 hover:scale-100 transition-all duration-200">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative h-[870px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt="Luxury co-living space"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhcdk72WCvxNCwMJ1l2loPc7PYpkJv0DAkVeY_Trh_cRRFNf8VphDVngZkSIb0myzjILLuzF5BNy6PboGB1H-l4_dktfGlRcS4v--ItJQd8jUUs7RmLgboUnBKNK6SeYle3bnMW8rkrBG0JAxnRhZqRjp-XeDYBFdmWuaiRyG6pbSJyWrgASN6wInpvm5HCWFmDQ-Nv_6qrHTJUGls-vt8ZN8A8DxNEjiCBCqEgucXjbwzHtJfaE9Ukh_Zhpcg3slBg4yzG4-5Q3Ir"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-orange-100 text-orange-900 font-label text-[10px] font-bold tracking-[0.2em] uppercase">
                Redefining Shared Living
              </span>
              <h1 className="font-headline text-[3.5rem] leading-[1.1] font-extrabold tracking-tighter text-slate-900 mb-8">
                The art of <span className="text-orange-600 italic">togetherness</span>, beautifully curated.
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-12 max-w-lg">
                Move beyond simple housing. Experience a lifestyle defined by community, flexible luxury, and spaces designed to inspire your best work and life.
              </p>
            </div>

            {/* Search Bar Floating */}
            <div className="editorial-shadow bg-white rounded-full p-2 max-w-4xl flex flex-wrap md:flex-nowrap items-center gap-2">
              <form onSubmit={handleSearch} className="w-full flex flex-wrap md:flex-nowrap items-center gap-2">
                <div className="flex-1 px-6 py-3 flex items-center space-x-3">
                  <span className="material-symbols-outlined text-orange-600">location_on</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Location</span>
                    <input
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-900 placeholder:text-slate-400 font-medium"
                      placeholder="Where to?"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-300 hidden md:block"></div>
                <div className="flex-1 px-6 py-3 flex items-center space-x-3">
                  <span className="material-symbols-outlined text-orange-600">calendar_today</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Move In</span>
                    <input
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-900 placeholder:text-slate-400 font-medium"
                      placeholder="Add dates"
                      type="text"
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-300 hidden md:block"></div>
                <div className="flex-1 px-6 py-3 flex items-center space-x-3">
                  <span className="material-symbols-outlined text-orange-600">bed</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Room Type</span>
                    <select
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-900 font-medium appearance-none"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                    >
                      <option>Private Suite</option>
                      <option>Shared Studio</option>
                      <option>Penthouse Loft</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white h-14 w-14 md:w-48 rounded-full flex items-center justify-center space-x-2 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined">search</span>
                  <span className="hidden md:inline font-bold tracking-tight">Search Spaces</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Featured Listings (Bento Grid Style) */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <h2 className="font-headline text-3xl font-bold tracking-tight text-slate-900 mb-2">Editor's Choice</h2>
                <p className="text-slate-600 font-body">Hand-picked residences in the world's most vibrant neighborhoods.</p>
              </div>
              <a className="group flex items-center space-x-2 text-orange-600 font-bold" href="#">
                <span>View all destinations</span>
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_right_alt</span>
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Featured Large Card */}
              <div className="md:col-span-8 group relative overflow-hidden rounded-xl h-[500px]">
                <img
                  alt="Luxury apartment"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuChZ7JFQA_HT38YA1e3TQVA7d54wYO6eJaskyXrs41C25XAZfnGgDKjJMlL4p_w5HZCQdma5XGQ3CX3S__3bbjoPpUF3rvE7_L_wAmxNfLnE89xrwXFTUtnJOb5B0FAny4PxYGjdOXaBa0y0JWcbam8v6cOy-J1TyLcPmP5T-rWZ-ihBkhFZVwM2DFqlvY89dYcUCQQsWM41F0M0iQpkPY2s1xcpWel2JV6hSTBrHEEcLMfhg5mJvJ4eXfOir2XB3JgYVvBDBVrvMF-"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-10 text-white w-full flex justify-between items-end">
                  <div>
                    <div className="flex gap-2 mb-4">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">London, Shoreditch</span>
                      <span className="bg-orange-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Popular</span>
                    </div>
                    <h3 className="font-headline text-3xl font-bold mb-2">The Brickwork House</h3>
                    <p className="text-white/80 max-w-sm">A historic conversion featuring 12 private suites and a rooftop garden overlooking the city skyline.</p>
                  </div>
                  <div className="bg-white text-slate-900 p-6 rounded-xl text-center editorial-shadow transform translate-y-4 group-hover:translate-y-0 transition-transform">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Starting from</p>
                    <p className="text-2xl font-extrabold tracking-tight">
                      £1,850<span className="text-sm font-normal text-slate-500">/mo</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Side Grid Column */}
              <div className="md:col-span-4 flex flex-col gap-8">
                <div className="flex-1 group relative overflow-hidden rounded-xl">
                  <img
                    alt="Cozy room"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXcTgabXuuOlorraJEHjz-xWYM8tiYciBFdLrAxCFykt4cMRfbThy5IdeKn-ps_2lnOag6rIkkv1OuA7z6a-pnvjRU-FqbDU4sbfHf4SBBD1MQFy2CoPypwVnU4EweOq6EHdWlsQfsvDo_g66EkZbScbrhxzkfSez2Hp1FVaqNQCqpnf-vRBm_VCQTokc688xMdgNwRsuAA-jSWjdL5O60b1XA8MXTXw8jrL91LKeI9WX2hOrWNrB3wv0GuhMujwZxf2FoabUYv6bJ"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h4 className="font-headline text-xl font-bold">The Nomad Studio</h4>
                    <p className="text-sm text-white/80">Berlin • Mitte</p>
                  </div>
                </div>
                <div className="flex-1 group relative overflow-hidden rounded-xl">
                  <img
                    alt="Modern living"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2a9Ff2340AYsnWScJEVZ9EngKLyTwaxVAyF7iQvz3D0fsAsOKvtdPhetYZKwjhnLynipy39davEG4liTE17mklDRohQY3n9PPndjCcV2Lg5PWcpdIgglKu4tW6n2-l7mjEPZjuluCavGJxXmXbaNR0nQlnOCF6mPDFTlcrzjymFvuUUeA13OdkALrtts3BZxmpIVzGhPmEzIUSgOe7ocVYR0uFDknZVP1lfKU7W20B23_P3Z4iX0TdttzKBlCpTj-V7KWNe4eVDJ0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h4 className="font-headline text-xl font-bold">Arcade Lofts</h4>
                    <p className="text-sm text-white/80">Barcelona • Gràcia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us (Asymmetric Layout) */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="relative">
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-orange-200/20 rounded-full blur-3xl"></div>
                <img
                  alt="Community laughing"
                  className="rounded-xl relative z-10 editorial-shadow grayscale hover:grayscale-0 transition-all duration-1000"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsNZxSeG2RPJRNOzaQ9JUeDvv71zeoHMp0mayIkLFwG_rKBFjKorAjwEoZSKGR83-3JJY00-9-WUYkVHcKKVyXk_jMnlCb-HfepeWkxaRDv3_hjYcVjRGv9E1l6nEM8-z-kgT_PN9XBXx95LE98OO6GUx0k49cLLdMcWCVD63SF2-7leUmSvNlyeAqIqJet4PeNdREtGwJFlLEcG9Sxbfr6MlkH_wdBdSU8ywAGy6WP2TSBDQQ3HGhzg8EFDIbSQAgFzHrKebEHBDW"
                />
                <div className="absolute -bottom-10 -right-10 bg-white p-8 rounded-xl shadow-xl z-20 max-w-xs hidden md:block">
                  <span className="material-symbols-outlined text-orange-600 text-4xl mb-4">format_quote</span>
                  <p className="italic text-slate-600 mb-4">"It's more than just a room; it's where I found my business partners and my best friends."</p>
                  <p className="font-bold text-sm">— Elena M., Founder</p>
                </div>
              </div>
              <div className="space-y-12">
                <div className="text-left">
                  <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-6">
                    Designed for the <span className="text-orange-600 italic">modern soul</span>.
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">We believe your home should be an extension of your ambitions. Every space is meticulously crafted to balance privacy with possibility.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">groups</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Radical Community</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Weekly chef dinners, workshop series, and wellness sessions as standard.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">bolt</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Total Flexibility</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Stay for a month, or a year. Transfer between cities with 30 days' notice.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">chair</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Editorial Design</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Interiors designed by award-winning architects for beauty and function.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 editorial-shadow">
                      <span className="material-symbols-outlined text-orange-600">wifi</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">Seamless Utility</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">One all-inclusive bill covering ultra-fast WiFi, cleaning, and supplies.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter / CTA */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="bg-slate-900 rounded-3xl p-12 md:p-20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
                <img
                  alt="Office space"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZ_1hraTV-gfUANJwcY8U18fmYa2NF0w_tcav0GmAcpZz_DA8zjk_p7OWWgb7hZ-FvJi38yePEaGyWZS64rLIS-dySerMzMCFcE4xsWEL5KdSeV-k0v91eZdlyN0N77T0jI29YCOsT9ygi5z95MdsTr9L4Jk4ov5Zi4Nz1GOip1Yh95fh60cz6I0Ze4W2B_dAfR3F8BQH-kKTX0Q5_WyqP3zU1KPBWiQbILx58az47ZRbyS5hr_mvcVcN58xcqCFSngJW4PBksX6Le"
                />
              </div>
              <div className="relative z-10 max-w-xl">
                <h2 className="font-headline text-4xl font-bold text-white mb-6">Stay for the story.</h2>
                <p className="text-white/70 text-lg mb-10">Get early access to our newest location openings and exclusive community events delivered to your inbox.</p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4">
                  <input
                    className="flex-1 bg-white/10 border border-white/20 rounded-full px-6 py-4 text-white placeholder:text-white/40 focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Your email address"
                    type="email"
                  />
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-full transition-colors whitespace-nowrap"
                  >
                    Join the Circle
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 w-full pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 max-w-7xl mx-auto font-['Inter'] leading-relaxed text-sm">
          <div className="col-span-1 md:col-span-1">
            <div className="text-lg font-black text-slate-900 dark:text-white mb-6">The Curated Hearth</div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">A premium co-living network for the creative and professional community.</p>
            <div className="flex space-x-4">
              <a className="text-orange-800 dark:text-orange-300 opacity-80 hover:opacity-100 transition-opacity" href="#">
                Instagram
              </a>
              <a className="text-orange-800 dark:text-orange-300 opacity-80 hover:opacity-100 transition-opacity" href="#">
                LinkedIn
              </a>
            </div>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[10px]">Company</h5>
            <ul className="space-y-4">
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  About Us
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Contact
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Careers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[10px]">Resources</h5>
            <ul className="space-y-4">
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Terms of Service
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[10px]">Locations</h5>
            <ul className="space-y-4">
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  London
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Berlin
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Barcelona
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-12 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-center md:text-left">
          <p className="text-slate-400 text-xs">© 2024 The Curated Hearth. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

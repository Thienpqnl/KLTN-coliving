import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing rooms
  await prisma.room.deleteMany();

  // Create sample rooms
  const rooms = await prisma.room.createMany({
    data: [
      // Hanoi
      {
        title: 'Suite Riêng tư sang trọng - Hoàn Kiếm',
        description: 'Phòng thiết kế hiện đại với cửa sổ thoáng sáng, phòng tắm riêng, ban công nhìn ra thành phố.',
        price: 15000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChZ7JFQA_HT38YA1e3TQVA7d54wYO6eJaskyXrs41C25XAZfnGgDKjJMlL4p_w5HZCQdma5XGQ3CX3S__3bbjoPpUF3rvE7_L_wAmxNfLnE89xrwXFTUtnJOb5B0FAny4PxYGjdOXaBa0y0JWcbam8v6cOy-J1TyLcPmP5T-rWZ-ihBkhFZVwM2DFqlvY89dYcUCQQsWM41F0M0iQpkPY2s1xcpWel2JV6hSTBrHEEcLMfhg5mJvJ4eXfOir2XB3JgYVvBDBVrvMF-',
        address: '123 Phố Lý Thái Tổ, Hoàn Kiếm, Hà Nội',
        city: 'Hà Nội',
        roomType: 'Suite Riêng tư',
        capacity: 1,
      },
      {
        title: 'Studio Chung - Thanh Xuân',
        description: 'Studio thoáng sáng với bếp hiện đại, khu vực làm việc thoải mái, giáp khu vực chung.',
        price: 10000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXcTgabXuuOlorraJEHjz-xWYM8tiYciBFdLrAxCFykt4cMRfbThy5IdeKn-ps_2lnOag6rIkkv1OuA7z6a-pnvjRU-FqbDU4sbfHf4SBBD1MQFy2CoPypwVnU4EweOq6EHdWlsQfsvDo_g66EkZbScbrhxzkfSez2Hp1FVaqNQCqpnf-vRBm_VCQTokc688xMdgNwRsuAA-jSWjdL5O60b1XA8MXTXw8jrL91LKeI9WX2hOrWNrB3wv0GuhMujwZxf2FoabUYv6bJ',
        address: '456 Đường Thanh Xuân, Thanh Xuân, Hà Nội',
        city: 'Hà Nội',
        roomType: 'Studio Chung',
        capacity: 2,
      },
      {
        title: 'Penthouse Loft - Ba Đình',
        description: 'Loft cao cấp với nội thất tối tân, ban công rộng, view toàn thành phố Hà Nội.',
        price: 25000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2a9Ff2340AYsnWScJEVZ9EngKLyTwaxVAyF7iQvz3D0fsAsOKvtdPhetYZKwjhnLynipy39davEG4liTE17mklDRohQY3n9PPndjCcV2Lg5PWcpdIgglKu4tW6n2-l7mjEPZjuluCavGJxXmXbaNR0nQlnOCF6mPDFTlcrzjymFvuUUeA13OdkALrtts3BZxmpIVzGhPmEzIUSgOe7ocVYR0uFDknZVP1lfKU7W20B23_P3Z4iX0TdttzKBlCpTj-V7KWNe4eVDJ0',
        address: '789 Phố Cầu Tươi, Ba Đình, Hà Nội',
        city: 'Hà Nội',
        roomType: 'Penthouse Loft',
        capacity: 4,
      },
      // Da Nang
      {
        title: 'Suite Riêng tư - Hải Châu',
        description: 'Phòng thoảy với cửa sổ hướng biển, nội thất sang trọng, sạch sẽ và an toàn.',
        price: 12000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsNZxSeG2RPJRNOzaQ9JUeDvv71zeoHMp0mayIkLFwG_rKBFjKorAjwEoZSKGR83-3JJY00-9-WUYkVHcKKVyXk_jMnlCb-HfepeWkxaRDv3_hjYcVjRGv9E1l6nEM8-z-kgT_PN9XBXx95LE98OO6GUx0k49cLLdMcWCVD63SF2-7leUmSvNlyeAqIqJet4PeNdREtGwJFlLEcG9Sxbfr6MlkH_wdBdSU8ywAGy6WP2TSBDQQ3HGhzg8EFDIbSQAgFzHrKebEHBDW',
        address: '321 Tôn Đức Thắng, Hải Châu, Đà Nẵng',
        city: 'Đà Nẵng',
        roomType: 'Suite Riêng tư',
        capacity: 1,
      },
      {
        title: 'Studio Chung - Sơn Trà',
        description: 'Studio với tầm nhìn biển đẹp, gần bãi biển Mỹ Khánh, tiện ích đầy đủ.',
        price: 9000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ_1hraTV-gfUANJwcY8U18fmYa2NF0w_tcav0GmAcpZz_DA8zjk_p7OWWgb7hZ-FvJi38yePEaGyWZS64rLIS-dySerMzMCFcE4xsWEL5KdSeV-k0v91eZdlyN0N77T0jI29YCOsT9ygi5z95MdsTr9L4Jk4ov5Zi4Nz1GOip1Yh95fh60cz6I0Ze4W2B_dAfR3F8BQH-kKTX0Q5_WyqP3zU1KPBWiQbILx58az47ZRbyS5hr_mvcVcN58xcqCFSngJW4PBksX6Le',
        address: '654 Bạch Đằng, Sơn Trà, Đà Nẵng',
        city: 'Đà Nẵng',
        roomType: 'Studio Chung',
        capacity: 2,
      },
      // Ho Chi Minh City
      {
        title: 'Suite Riêng tư - Quận 1',
        description: 'Phòng cao cấp tại trung tâm TP.HCM, gần sân bay Tân Sơn Nhất, đầy đủ tiện ích.',
        price: 18000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhcdk72WCvxNCwMJ1l2loPc7PYpkJv0DAkVeY_Trh_cRRFNf8VphDVngZkSIb0myzjILLuzF5BNy6PboGB1H-l4_dktfGlRcS4v--ItJQd8jUUs7RmLgboUnBKNK6SeYle3bnMW8rkrBG0JAxnRhZqRjp-XeDYBFdmWuaiRyG6pbSJyWrgASN6wInpvm5HCWFmDQ-Nv_6qrHTJUGls-vt8ZN8A8DxNEjiCBCqEgucXjbwzHtJfaE9Ukh_Zhpcg3slBg4yzG4-5Q3Ir',
        address: '111 Nguyễn Huệ, Quận 1, TP.HCM',
        city: 'Thành phố Hồ Chí Minh',
        roomType: 'Suite Riêng tư',
        capacity: 1,
      },
      {
        title: 'Studio Chung - Quận 3',
        description: 'Studio hiện đại gần Đại học Sài Gòn, khu vực yên tĩnh, tiện đi lại.',
        price: 11000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChZ7JFQA_HT38YA1e3TQVA7d54wYO6eJaskyXrs41C25XAZfnGgDKjJMlL4p_w5HZCQdma5XGQ3CX3S__3bbjoPpUF3rvE7_L_wAmxNfLnE89xrwXFTUtnJOb5B0FAny4PxYGjdOXaBa0y0JWcbam8v6cOy-J1TyLcPmP5T-rWZ-ihBkhFZVwM2DFqlvY89dYcUCQQsWM41F0M0iQpkPY2s1xcpWel2JV6hSTBrHEEcLMfhg5mJvJ4eXfOir2XB3JgYVvBDBVrvMF-',
        address: '222 Võ Văn Tần, Quận 3, TP.HCM',
        city: 'Thành phố Hồ Chí Minh',
        roomType: 'Studio Chung',
        capacity: 2,
      },
      {
        title: 'Penthouse Loft - Quận 2',
        description: 'Loft cao cấp với view sông Sài Gòn, nội thất sang trọng, khu vực an ninh tốt.',
        price: 28000000,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXcTgabXuuOlorraJEHjz-xWYM8tiYciBFdLrAxCFykt4cMRfbThy5IdeKn-ps_2lnOag6rIkkv1OuA7z6a-pnvjRU-FqbDU4sbfHf4SBBD1MQFy2CoPypwVnU4EweOq6EHdWlsQfsvDo_g66EkZbScbrhxzkfSez2Hp1FVaqNQCqpnf-vRBm_VCQTokc688xMdgNwRsuAA-jSWjdL5O60b1XA8MXTXw8jrL91LKeI9WX2hOrWNrB3wv0GuhMujwZxf2FoabUYv6bJ',
        address: '333 Thạo Điền, Quận 2, TP.HCM',
        city: 'Thành phố Hồ Chí Minh',
        roomType: 'Penthouse Loft',
        capacity: 4,
      },
    ],
  });

  console.log(`Created ${rooms.count} rooms`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

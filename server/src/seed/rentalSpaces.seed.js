const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const RentalSpace = require('../models/RentalSpace');

const rentalSpaces = [
  {
    title: 'Velika sala',
    slug: 'velika-scena-zakup',
    shortDescription: 'Najakustičnija sala u Beogradu, projektovana prema najvišim standardima savremenog teatra.',
    description: '<p>Savršen izbor za velike kongrese, svečane akademije, koncerte i reprezentativne korporativne događaje.</p>',
    seatedCapacity: 504,
    standingCapacity: 504,
    areaSqm: 0,
    amenities: ['Vrhunska akustika', 'Simultani prevod'],
    technicalEquipment: ['TV/Internet priključci', 'Scenska rasveta', 'Ozvučenje'],
    suitableEventTypes: ['konferencija', 'promocija', 'koncert', 'svečanost'],
    accessibilityInfo: 'Pristup je moguć za osobe sa smanjenom pokretljivošću.',
    dressingRooms: 'Dostupne su garderobe za izvođače.',
    cateringInfo: 'Catering se dogovara po upitu.',
    barInfo: 'Bar usluga je dostupna po dogovoru.',
    internetInfo: 'Internet priključci dostupni su uz tehničku najavu.',
    avInfo: 'Kompletna scenska i AV podrška dostupna je uz tehničku najavu.',
    isFeatured: true,
    displayOrder: 1,
  },
  {
    title: 'Bel Etage',
    slug: 'bel-etage',
    shortDescription: 'Atraktivan i višenamenski prostor pogodan za dinamične događaje, od stručnih seminara do ekskluzivnih modnih revija i koktel zabava.',
    description: '<p>Bel Etage je prilagodljiv prostor za poslovne susrete, modne revije, koktele, seminare i druge događaje koji zahtevaju elegantan ambijent.</p>',
    seatedCapacity: 350,
    standingCapacity: 350,
    areaSqm: 500,
    amenities: ['Garderober', 'Kafe bar'],
    technicalEquipment: ['Audio sistem', 'Ambijentalna rasveta'],
    suitableEventTypes: ['seminar', 'modna revija', 'koktel', 'proslava'],
    dressingRooms: 'Garderoberi su dostupni po dogovoru.',
    cateringInfo: 'Catering se organizuje prema potrebama događaja.',
    barInfo: 'Kafe bar je dostupan u okviru prostora.',
    internetInfo: 'Internet priključak dostupan je po dogovoru.',
    avInfo: 'Audio sistem i tehnička podrška dostupni su uz najavu.',
    isFeatured: true,
    displayOrder: 2,
  },
  {
    title: 'Foaje',
    slug: 'foaje-madlenianuma',
    shortDescription: 'Impozantan prostor u prizemlju kojim dominira unikatni luster dizajnera Boreka Šipeka.',
    description: '<p>U kombinaciji sa prilaznom Pjacetom, Foaje je idealan za ekskluzivne prezentacije, izložbe, prijeme i koktele.</p>',
    seatedCapacity: 0,
    standingCapacity: 400,
    areaSqm: 420,
    amenities: ['Otvorene forme', 'Spojen sa Pjacetom'],
    technicalEquipment: ['Mobilno ozvučenje', 'Ambijentalna rasveta'],
    suitableEventTypes: ['koktel', 'promocija', 'izložba', 'prijem'],
    accessibilityInfo: 'Pristup se dogovara prema konfiguraciji događaja.',
    cateringInfo: 'Prostor je pogodan za koktel posluženje.',
    barInfo: 'Bar usluga je dostupna po dogovoru.',
    internetInfo: 'Internet je dostupan u okviru objekta.',
    avInfo: 'Mobilna AV oprema dostupna je po zahtevu.',
    displayOrder: 3,
  },
  {
    title: 'Sala Studio',
    slug: 'sala-studio',
    shortDescription: 'Fleksibilan prostor idealan za manje umetničke produkcije, studijska izvođenja, stručne seminare i kombinovane događaje.',
    description: '<p>Sala Studio omogućava različite konfiguracije gledališta i mobilne pozornice, uz scensku rasvetu prilagođenu događaju.</p>',
    seatedCapacity: 160,
    standingCapacity: 160,
    areaSqm: 0,
    amenities: ['Amfiteatarska postavka', 'Mobilna pozornica'],
    technicalEquipment: ['Scenska rasveta', 'Audio sistem'],
    suitableEventTypes: ['drama', 'seminar', 'studijsko izvođenje', 'prezentacija'],
    internetInfo: 'Internet je dostupan u objektu.',
    avInfo: 'Scenska rasveta i audio podrška dostupne su uz tehničku najavu.',
    displayOrder: 4,
  },
  {
    title: 'Sala Sifnios',
    slug: 'sala-sifnios',
    shortDescription: 'Multifunkcionalni prostor namenjen pedagoškom i baletskom radu, kao i plenarnim sednicama, master-klasovima i radionicama.',
    description: '<p>Svetao i funkcionalan studio pogodan za mesečni zakup, probe, edukativne programe, radionice i poslovne sastanke.</p>',
    seatedCapacity: 100,
    standingCapacity: 100,
    areaSqm: 0,
    amenities: ['Baletska i pedagoška sala', 'Mesečni zakup'],
    technicalEquipment: ['Ogledala', 'Baletski rukohvati'],
    suitableEventTypes: ['radionica', 'sastanak', 'proba', 'master-klas'],
    accessibilityInfo: 'Pristup se dogovara prema terminu zakupa.',
    displayOrder: 5,
  },
  {
    title: 'VIP salon',
    slug: 'vip-salon',
    shortDescription: 'Ekskluzivno opremljen i diskretan prostor za specijalne zvanice, protokolarne sastanke i privatne pauze.',
    description: '<p>VIP salon se nalazi u nivou Velike sale i nudi miran, reprezentativan ambijent za prijem važnih gostiju i diskretne poslovne susrete.</p>',
    seatedCapacity: 12,
    standingCapacity: 20,
    areaSqm: 0,
    amenities: ['Ekskluzivna zona', 'VIP protokol', 'Diskrecija'],
    technicalEquipment: ['Internet', 'Direktna komunikacija sa salom'],
    suitableEventTypes: ['protokolarni sastanak', 'prijem', 'privatna pauza'],
    accessibilityInfo: 'Salon je u nivou Velike sale.',
    cateringInfo: 'Individualno posluženje dostupno je po dogovoru.',
    internetInfo: 'Internet je dostupan u salonu.',
    displayOrder: 6,
  },
];

const run = async () => {
  try {
    await connectDB();

    for (const space of rentalSpaces) {
      await RentalSpace.findOneAndUpdate(
        { slug: space.slug },
        {
          $set: {
            ...space,
            status: 'published',
            publishedAt: new Date(),
            seo: {
              title: `${space.title} | Zakup prostora Madlenianum`,
              description: space.shortDescription,
              keywords: ['Madlenianum', 'zakup prostora', space.title],
            },
          },
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
      );
      console.log(`Rental space ready: ${space.title} (${space.slug})`);
    }

    console.log(`Rental spaces updated: ${rentalSpaces.length}`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { db, auth, signInWithEmailAndPassword } from '../src/firebase';
import { doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { makkahHotels } from './makkah-hotels';

// Compact type definition: [name, city, stars, mealPlan, [ [range, [ [roomType, price], ... ]], ... ]]
export type CompactHotel = [
  string, // name
  'Makkah' | 'Madinah', // city
  number, // stars
  string, // mealPlan
  [string, [string, number][]][] // seasons
];

const compactHotels: CompactHotel[] = [
  // Page 2
  [
    "Hotel Hilton Madinah", "Madinah", 5, "FB", [
      ["16/06/2026 TO 31/08/2026", [["Single", 1505], ["Double", 1910], ["Triple", 2500]]],
      ["01/09/2026 TO 31/10/2026", [["Single", 1810], ["Double", 2215], ["Triple", 2810]]],
      ["01/11/2026 TO 18/11/2026", [["Single", 1875], ["Double", 2290], ["Triple", 2930]]],
      ["19/11/2026 TO 18/12/2026", [["Single", 2240], ["Double", 2650], ["Triple", 3300]]],
      ["19/12/2026 TO 11/01/2027", [["Single", 2795], ["Double", 3200], ["Triple", 3855]]],
      ["12/01/2027 TO 07/02/2027", [["Single", 2055], ["Double", 2465], ["Triple", 3115]]]
    ]
  ],
  [
    "Hotel Dar Al Taqwa", "Madinah", 5, "FB", [
      ["05/06/2026 TO 30/08/2026", [["Double", 2080], ["Triple", 2970], ["Quad", 3860]]],
      ["30/08/2026 TO 23/09/2026", [["Double", 2520], ["Triple", 3410], ["Quad", 4300]]],
      ["23/09/2026 TO 27/09/2026", [["Double", 2770], ["Triple", 3660], ["Quad", 4550]]],
      ["27/09/2026 TO 22/10/2026", [["Double", 2520], ["Triple", 3410], ["Quad", 4300]]]
    ]
  ],
  [
    "Hotel Burj Al Madinah", "Madinah", 4, "FB", [
      ["25/06/2026 TO 30/09/2026", [["Double", 1050], ["Triple", 1300], ["Quad", 1550]]],
      ["01/10/2026 TO 05/11/2026", [["Double", 1100], ["Triple", 1350], ["Quad", 1600]]],
      ["06/11/2026 TO 15/12/2026", [["Double", 1700], ["Triple", 1950], ["Quad", 2200]]],
      ["16/12/2026 TO 05/01/2027", [["Double", 1820], ["Triple", 2070], ["Quad", 2320]]],
      ["06/01/2027 TO 07/02/2027", [["Double", 1700], ["Triple", 1950], ["Quad", 2200]]]
    ]
  ],
  // Page 3
  [
    "Hotel Le Bosphorus", "Madinah", 4, "HB", [
      ["16/06/2026 TO 14/08/2026", [["Double", 885], ["Triple", 1005], ["Quad", 1130]]],
      ["14/08/2026 TO 15/09/2026", [["Double", 1005], ["Triple", 1130], ["Quad", 1250]]],
      ["15/09/2026 TO 01/11/2026", [["Double", 1130], ["Triple", 1250], ["Quad", 1375]]],
      ["01/11/2026 TO 15/12/2026", [["Double", 1160], ["Triple", 1280], ["Quad", 1403]]],
      ["15/12/2026 TO 08/02/2027", [["Double", 1590], ["Triple", 1715], ["Quad", 1835]]]
    ]
  ],
  [
    "Hotel Waqf Al Safi", "Madinah", 4, "HB", [
      ["16/06/2026 TO 14/08/2026", [["Double", 885], ["Triple", 1005], ["Quad", 1130]]],
      ["14/08/2026 TO 15/09/2026", [["Double", 1005], ["Triple", 1130], ["Quad", 1250]]],
      ["15/09/2026 TO 01/11/2026", [["Double", 1130], ["Triple", 1250], ["Quad", 1375]]],
      ["01/11/2026 TO 15/12/2026", [["Double", 1160], ["Triple", 1280], ["Quad", 1403]]],
      ["15/12/2026 TO 08/02/2027", [["Double", 1590], ["Triple", 1715], ["Quad", 1835]]]
    ]
  ],
  [
    "Makarem Haram View Suites", "Madinah", 4, "RO", [
      ["30/06/2026 TO 30/09/2026", [["Jr Suite (2pax)", 1085], ["Family Suite (4pax)", 1570], ["3 Bed Suite (6pax)", 1905]]]
    ]
  ],
  // Page 4
  [
    "Maden Hotel", "Madinah", 5, "FB", [
      ["25/06/2026 TO 14/08/2026", [["Double", 1050], ["Triple", 1200], ["Quad", 1350]]],
      ["14/08/2026 TO 01/10/2026", [["Double", 1150], ["Triple", 1300], ["Quad", 1450]]],
      ["01/10/2026 TO 01/11/2026", [["Double", 1200], ["Triple", 1350], ["Quad", 1500]]],
      ["01/11/2026 TO 20/12/2026", [["Double", 1300], ["Triple", 1500], ["Quad", 1700]]],
      ["20/12/2026 TO 20/01/2027", [["Double", 2250], ["Triple", 2550], ["Quad", 2950]]]
    ]
  ],
  [
    "Hotel Maden Al Rawda", "Madinah", 5, "FB", [
      ["25/06/2026 TO 14/08/2026", [["Double", 950], ["Triple", 1100], ["Quad", 1300]]],
      ["14/08/2026 TO 01/10/2026", [["Double", 1050], ["Triple", 1200], ["Quad", 1400]]],
      ["01/10/2026 TO 01/11/2026", [["Double", 1100], ["Triple", 1250], ["Quad", 1450]]],
      ["01/11/2026 TO 20/12/2026", [["Double", 1200], ["Triple", 1400], ["Quad", 1600]]],
      ["20/12/2026 TO 20/01/2027", [["Double", 2250], ["Triple", 2550], ["Quad", 3050]]]
    ]
  ],
  [
    "Hotel Maden Taiba", "Madinah", 5, "FB", [
      ["25/06/2026 TO 14/08/2026", [["Double", 850], ["Triple", 1000], ["Quad", 1200]]],
      ["14/08/2026 TO 01/10/2026", [["Double", 950], ["Triple", 1100], ["Quad", 1300]]],
      ["01/10/2026 TO 01/11/2026", [["Double", 1000], ["Triple", 1150], ["Quad", 1350]]],
      ["01/11/2026 TO 20/12/2026", [["Double", 1100], ["Triple", 1300], ["Quad", 1500]]],
      ["20/12/2026 TO 20/01/2027", [["Double", 2050], ["Triple", 2350], ["Quad", 2850]]]
    ]
  ],
  // Page 5
  [
    "Hotel Millenium Taiba", "Madinah", 5, "FB", [
      ["30/06/2026 TO 30/09/2026", [["Double", 750], ["Triple", 875], ["Quad", 1000]]],
      ["01/10/2026 TO 10/12/2026", [["Double", 850], ["Triple", 975], ["Quad", 1100]]],
      ["11/12/2026 TO 10/01/2027", [["Double", 1300], ["Triple", 1435], ["Quad", 1570]]]
    ]
  ],
  // Page 6
  [
    "Hotel Peninsula Worth", "Madinah", 4, "FB", [
      ["16/06/2026 TO 19/08/2026", [["Double", 700], ["Triple", 810], ["Quad", 920]]],
      ["19/08/2026 TO 16/12/2026", [["Double", 800], ["Triple", 920], ["Quad", 1040]]],
      ["16/12/2026 TO 09/01/2027", [["Double", 1250], ["Triple", 1400], ["Quad", 1550]]],
      ["09/01/2027 TO 08/02/2027", [["Double", 950], ["Triple", 1100], ["Quad", 1250]]]
    ]
  ],
  [
    "Hotel Dallah Taiba", "Madinah", 4, "FB", [
      ["01/07/2026 TO 20/08/2026", [["Double", 806], ["Triple", 947], ["Jr Suite (4pax)", 1209]]],
      ["20/08/2026 TO 01/09/2026", [["Double", 866], ["Triple", 1007], ["Jr Suite (4pax)", 1269]]],
      ["01/09/2026 TO 20/11/2026", [["Double", 806], ["Triple", 947], ["Jr Suite (4pax)", 1209]]],
      ["20/11/2026 TO 01/12/2026", [["Double", 1349], ["Triple", 1551], ["Jr Suite (4pax)", 1873]]],
      ["01/12/2026 TO 20/12/2026", [["Double", 866], ["Triple", 1007], ["Jr Suite (4pax)", 1269]]],
      ["20/12/2026 TO 10/01/2027", [["Double", 1470], ["Triple", 1671], ["Jr Suite (4pax)", 1994]]]
    ]
  ],
  [
    "Dar Al Hijra Intercontinental", "Madinah", 5, "FB", [
      ["23/06/2026 TO 31/08/2026", [["Double", 790], ["Triple", 975], ["Quad", 1160]]],
      ["01/09/2026 TO 30/09/2026", [["Double", 895], ["Triple", 1080], ["Quad", 1265]]],
      ["01/10/2026 TO 31/10/2026", [["Double", 985], ["Triple", 1170], ["Quad", 1355]]]
    ]
  ],
  // Page 7
  [
    "Hotel The Venue Al Harithia", "Madinah", 5, "FB", [
      ["23/06/2026 TO 20/09/2026", [["Double", 820], ["Triple", 970], ["Quad", 1120]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 870], ["Triple", 1020], ["Quad", 1170]]]
    ]
  ],
  [
    "Grand Plaza Badr Al Maqom", "Madinah", 4, "FB", [
      ["20/06/2026 TO 20/09/2026", [["Double", 590], ["Triple", 670], ["Quad", 750]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 620], ["Triple", 700], ["Quad", 780]]]
    ]
  ],
  [
    "Hotel Shaza Regency Plaza", "Madinah", 5, "FB", [
      ["27/06/2026 TO 20/09/2026", [["Double", 570], ["Triple", 650], ["Quad", 730]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 600], ["Triple", 680], ["Quad", 760]]]
    ]
  ],
  [
    "Dar Al Iman Intercontinental", "Madinah", 5, "FB", [
      ["11/06/2026 TO 31/07/2026", [["Double", 1370], ["Triple", 1680], ["Quad", 1990]]],
      ["01/08/2026 TO 30/09/2026", [["Double", 1490], ["Triple", 1800], ["Quad", 2100]]],
      ["01/10/2026 TO 31/10/2026", [["Double", 1736], ["Triple", 2106], ["Quad", 2476]]]
    ]
  ],
  [
    "Hotel Millenium Aqeeq", "Madinah", 5, "FB", [
      ["25/06/2026 TO 30/09/2026", [["Double", 825], ["Triple", 950], ["Quad", 1075]]],
      ["01/10/2026 TO 10/12/2026", [["Double", 910], ["Triple", 1035], ["Quad", 1160]]]
    ]
  ],
  // Page 8
  [
    "Hotel Dar Al Eiman Al Haram", "Madinah", 5, "FB", [
      ["16/06/2026 TO 30/06/2026", [["Double", 1050], ["Triple", 1350], ["Quad", 1650]]],
      ["30/06/2026 TO 15/08/2026", [["Double", 850], ["Triple", 975], ["Quad", 1100]]],
      ["15/08/2026 TO 11/11/2026", [["Double", 950], ["Triple", 1075], ["Quad", 1200]]],
      ["11/11/2026 TO 10/12/2026", [["Double", 1150], ["Triple", 1275], ["Quad", 1400]]]
    ]
  ],
  [
    "The Oberoi Hotel", "Madinah", 5, "FB", [
      ["16/06/2026 TO 15/08/2026", [["Single", 1550], ["Double", 1750], ["Triple", 2250]]],
      ["15/08/2026 TO 11/11/2026", [["Single", 1750], ["Double", 1950], ["Triple", 2450]]],
      ["11/11/2026 TO 10/12/2026", [["Single", 2250], ["Double", 2450], ["Triple", 2950]]]
    ]
  ],
  [
    "Hotel Movenpick Madina", "Madinah", 5, "FB", [
      ["10/06/2026 TO 20/09/2026", [["Double", 900], ["Triple", 1050], ["Quad", 1200]]],
      ["21/09/2026 TO 02/11/2026", [["Double", 950], ["Triple", 1100], ["Quad", 1250]]]
    ]
  ],
  [
    "Hotel Emaar Royal", "Madinah", 4, "FB", [
      ["30/06/2026 TO 19/08/2026", [["Double", 625], ["Triple", 700], ["Quad", 775]]],
      ["19/08/2026 TO 16/12/2026", [["Double", 725], ["Triple", 825], ["Quad", 925]]],
      ["16/12/2026 TO 09/01/2027", [["Double", 1150], ["Triple", 1300], ["Quad", 1450]]],
      ["09/01/2027 TO 08/02/2027", [["Double", 825], ["Triple", 925], ["Quad", 1025]]]
    ]
  ],
  // Page 9
  [
    "Hotel Al Ritz Madina", "Madinah", 4, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 650], ["Triple", 730], ["Quad", 810]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 700], ["Triple", 780], ["Quad", 870]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 770], ["Triple", 860], ["Quad", 950]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 970], ["Triple", 1080], ["Quad", 1190]]]
    ]
  ],
  [
    "Hotel Waqf Uthman Bin Affan", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 530], ["Triple", 600], ["Quad", 670]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 580], ["Triple", 650], ["Quad", 720]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 630], ["Triple", 700], ["Quad", 780]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 830], ["Triple", 930], ["Quad", 1030]]]
    ]
  ],
  [
    "Hotel Jiwar Al Saha", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/09/2026", [["Double", 510], ["Triple", 560], ["Quad", 610]]],
      ["14/09/2026 TO 16/12/2026", [["Double", 560], ["Triple", 610], ["Quad", 660]]]
    ]
  ],
  [
    "Hotel Leader Muna Kareem", "Madinah", 4, "FB", [
      ["20/06/2026 TO 15/09/2026", [["Double", 720], ["Triple", 820], ["Quad", 920]]],
      ["16/09/2026 TO 31/10/2026", [["Double", 875], ["Triple", 1000], ["Quad", 1125]]]
    ]
  ],
  // Page 10
  [
    "Hotel Ansar Platinum", "Madinah", 3, "FB", [
      ["30/06/2026 TO 13/08/2026", [["Double", 500], ["Triple", 550], ["Quad", 600]]],
      ["14/08/2026 TO 10/11/2026", [["Double", 600], ["Triple", 650], ["Quad", 700]]],
      ["11/11/2026 TO 09/12/2026", [["Double", 700], ["Triple", 750], ["Quad", 800]]],
      ["10/12/2026 TO 08/01/2027", [["Double", 800], ["Triple", 850], ["Quad", 900]]],
      ["09/01/2027 TO 07/02/2027", [["Double", 800], ["Triple", 850], ["Quad", 900]]],
      ["08/02/2027 TO 21/02/2027", [["Double", 850], ["Triple", 900], ["Quad", 950]]],
      ["22/02/2027 TO 09/03/2027", [["Double", 750], ["Triple", 800], ["Quad", 850]]],
      ["10/03/2027 TO 13/03/2027", [["Double", 800], ["Triple", 850], ["Quad", 900]]],
      ["14/03/2027 TO 06/04/2027", [["Double", 550], ["Triple", 600], ["Quad", 650]]]
    ]
  ],
  // Page 11
  [
    "Hotel Deyar Al Eiman", "Madinah", 4, "FB", [
      ["30/06/2026 TO 15/08/2026", [["Double", 525], ["Triple", 575], ["Quad", 625], ["Quint", 675]]],
      ["15/08/2026 TO 11/11/2026", [["Double", 575], ["Triple", 625], ["Quad", 675], ["Quint", 725]]],
      ["11/11/2026 TO 10/12/2026", [["Double", 625], ["Triple", 675], ["Quad", 725], ["Quint", 775]]]
    ]
  ],
  [
    "Hotel Grand Plaza Al Madina", "Madinah", 4, "FB", [
      ["26/06/2026 TO 20/09/2026", [["Double", 550], ["Triple", 620], ["Quad", 690]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 570], ["Triple", 640], ["Quad", 710]]]
    ]
  ],
  [
    "Hotel Province Shams", "Madinah", 3, "FB", [
      ["01/07/2026 TO 31/08/2026", [["Double", 540], ["Triple", 585], ["Quad", 630]]]
    ]
  ],
  [
    "Hotel Elaf Taiba", "Madinah", 3, "FB", [
      ["16/06/2026 TO 15/10/2026", [["Double", 775], ["Triple", 900], ["Quad", 1025]]],
      ["15/10/2026 TO 15/12/2026", [["Double", 875], ["Triple", 1000], ["Quad", 1125]]],
      ["05/01/2027 TO 07/02/2027", [["Double", 925], ["Triple", 1050], ["Quad", 1175]]]
    ]
  ],
  // Page 12
  [
    "Hotel Nozol Royal Inn", "Madinah", 4, "FB", [
      ["25/06/2026 TO 14/08/2026", [["Double", 750], ["Triple", 850], ["Quad", 950]]],
      ["14/08/2026 TO 01/10/2026", [["Double", 850], ["Triple", 950], ["Quad", 1050]]],
      ["01/10/2026 TO 01/11/2026", [["Double", 900], ["Triple", 1000], ["Quad", 1100]]],
      ["01/11/2026 TO 20/12/2026", [["Double", 1000], ["Triple", 1150], ["Quad", 1300]]],
      ["20/12/2026 TO 20/01/2027", [["Double", 1850], ["Triple", 2100], ["Quad", 2350]]]
    ]
  ],
  [
    "Hotel Taiba Front", "Madinah", 4, "FB", [
      ["30/06/2026 TO 31/08/2026", [["Double", 750], ["Triple", 860], ["Quad", 970]]]
    ]
  ],
  [
    "Hotel Mias Madina", "Madinah", 4, "FB", [
      ["25/06/2026 TO 14/08/2026", [["Double", 680], ["Triple", 800], ["Quad", 920]]],
      ["14/08/2026 TO 20/10/2026", [["Double", 710], ["Triple", 830], ["Quad", 950]]],
      ["20/10/2026 TO 15/12/2026", [["Double", 810], ["Triple", 950], ["Quad", 1090]]],
      ["15/12/2026 TO 09/01/2027", [["Double", 1190], ["Triple", 1350], ["Quad", 1510]]],
      ["09/01/2027 TO 07/02/2027", [["Double", 930], ["Triple", 1080], ["Quad", 1230]]]
    ]
  ],
  // Page 13
  [
    "Hotel Tharawat Worth", "Madinah", 3, "FB", [
      ["16/06/2026 TO 19/08/2026", [["Double", 600], ["Triple", 675], ["Quad", 750]]],
      ["19/08/2026 TO 16/12/2026", [["Double", 700], ["Triple", 775], ["Quad", 850]]],
      ["16/12/2026 TO 09/01/2027", [["Double", 850], ["Triple", 950], ["Quad", 1050]]],
      ["09/01/2027 TO 08/02/2027", [["Double", 775], ["Triple", 850], ["Quad", 925]]]
    ]
  ],
  [
    "Hotel Al Zahabi Golden Tulip", "Madinah", 3, "FB", [
      ["30/06/2026 TO 13/08/2026", [["Double", 650], ["Triple", 700], ["Quad", 750]]],
      ["14/08/2026 TO 10/11/2026", [["Double", 750], ["Triple", 800], ["Quad", 850]]],
      ["11/11/2026 TO 09/12/2026", [["Double", 800], ["Triple", 850], ["Quad", 900]]],
      ["10/12/2026 TO 08/01/2027", [["Double", 950], ["Triple", 1000], ["Quad", 1050]]],
      ["09/01/2027 TO 07/02/2027", [["Double", 900], ["Triple", 950], ["Quad", 1000]]],
      ["08/02/2027 TO 21/02/2027", [["Double", 950], ["Triple", 1000], ["Quad", 1050]]],
      ["22/02/2027 TO 09/03/2027", [["Double", 1150], ["Triple", 1200], ["Quad", 1250]]],
      ["10/03/2027 TO 13/03/2027", [["Double", 900], ["Triple", 950], ["Quad", 1000]]],
      ["14/03/2027 TO 06/04/2027", [["Double", 650], ["Triple", 700], ["Quad", 750]]]
    ]
  ],
  // Page 14
  [
    "Hotel Al Mokhtara Diamond", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 450], ["Triple", 500], ["Quad", 550], ["Quint", 600]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 480], ["Triple", 530], ["Quad", 580], ["Quint", 630]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 510], ["Triple", 560], ["Quad", 610], ["Quint", 660]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 650], ["Triple", 700], ["Quad", 750], ["Quint", 800]]]
    ]
  ],
  [
    "Hotel Al Mokhtara Golden", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 430], ["Triple", 480], ["Quad", 530], ["Quint", 580]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 460], ["Triple", 510], ["Quad", 560], ["Quint", 610]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 490], ["Triple", 540], ["Quad", 590], ["Quint", 640]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 630], ["Triple", 680], ["Quad", 730], ["Quint", 780]]]
    ]
  ],
  [
    "Hotel Manazil Al Marsa", "Madinah", 3, "FB", [
      ["15/07/2026 TO 14/09/2026", [["Double", 530], ["Triple", 580], ["Quad", 630]]],
      ["14/09/2026 TO 16/12/2026", [["Double", 580], ["Triple", 630], ["Quad", 680]]]
    ]
  ],
  [
    "Hotel Dar Al Naeem", "Madinah", 4, "FB", [
      ["01/07/2026 TO 01/09/2026", [["Double", 390], ["Triple", 435], ["Quad", 480]]],
      ["01/09/2026 TO 15/10/2026", [["Double", 420], ["Triple", 465], ["Quad", 510]]],
      ["15/10/2026 TO 01/11/2026", [["Double", 470], ["Triple", 515], ["Quad", 560]]]
    ]
  ],
  // Page 15
  [
    "Hotel Durrat Al Eiman", "Madinah", 3, "FB", [
      ["30/06/2026 TO 15/08/2026", [["Double", 475], ["Triple", 525], ["Quad", 575], ["Quint", 625]]],
      ["15/08/2026 TO 11/11/2026", [["Double", 525], ["Triple", 575], ["Quad", 625], ["Quint", 675]]],
      ["11/11/2026 TO 10/12/2026", [["Double", 575], ["Triple", 675], ["Quad", 725], ["Quint", 775]]]
    ]
  ],
  [
    "Ancra Hotel by Continent", "Madinah", 3, "FB", [
      ["25/06/2026 TO 15/08/2026", [["Double", 550], ["Triple", 625], ["Quad", 700]]],
      ["15/08/2026 TO 11/11/2026", [["Double", 650], ["Triple", 725], ["Quad", 800]]],
      ["11/11/2026 TO 10/12/2026", [["Double", 750], ["Triple", 850], ["Quad", 950]]]
    ]
  ],
  [
    "Hayah Golden Hotel", "Madinah", 3, "FB", [
      ["01/07/2026 TO 15/08/2026", [["Double", 430], ["Triple", 475], ["Quad", 520]]],
      ["16/08/2026 TO 31/10/2026", [["Double", 450], ["Triple", 495], ["Quad", 540]]]
    ]
  ],
  [
    "Araek Taiba Hotel", "Madinah", 3, "FB", [
      ["01/07/2026 TO 15/08/2026", [["Double", 430], ["Triple", 475], ["Quad", 520]]],
      ["16/08/2026 TO 31/10/2026", [["Double", 450], ["Triple", 495], ["Quad", 540]]]
    ]
  ],
  [
    "Hayah Plaza Hotel", "Madinah", 3, "FB", [
      ["01/07/2026 TO 15/08/2026", [["Double", 430], ["Triple", 475], ["Quad", 520]]],
      ["16/08/2026 TO 31/10/2026", [["Double", 450], ["Triple", 495], ["Quad", 540]]]
    ]
  ],
  // Page 16
  [
    "Hotel Emaar Elite", "Madinah", 3, "FB", [
      ["30/06/2026 TO 19/08/2026", [["Double", 600], ["Triple", 675], ["Quad", 750]]],
      ["19/08/2026 TO 16/12/2026", [["Double", 700], ["Triple", 800], ["Quad", 900]]],
      ["16/12/2026 TO 09/01/2027", [["Double", 1125], ["Triple", 1275], ["Quad", 1425]]],
      ["09/01/2027 TO 08/02/2027", [["Double", 800], ["Triple", 900], ["Quad", 1000]]]
    ]
  ],
  [
    "Hotel Emaar El Mektan", "Madinah", 3, "FB", [
      ["30/06/2026 TO 19/08/2026", [["Double", 600], ["Triple", 675], ["Quad", 750]]],
      ["19/08/2026 TO 16/12/2026", [["Double", 700], ["Triple", 800], ["Quad", 900]]],
      ["16/12/2026 TO 09/01/2027", [["Double", 1125], ["Triple", 1275], ["Quad", 1425]]],
      ["09/01/2027 TO 08/02/2027", [["Double", 800], ["Triple", 900], ["Quad", 1000]]]
    ]
  ],
  [
    "Hotel Emaar Taibah", "Madinah", 3, "FB", [
      ["30/06/2026 TO 19/08/2026", [["Double", 430], ["Triple", 470], ["Quad", 510]]],
      ["19/08/2026 TO 16/12/2026", [["Double", 475], ["Triple", 535], ["Quad", 595]]],
      ["16/12/2026 TO 09/01/2027", [["Double", 650], ["Triple", 710], ["Quad", 770]]],
      ["09/01/2027 TO 08/02/2027", [["Double", 520], ["Triple", 585], ["Quad", 650]]]
    ]
  ],
  // Page 17
  [
    "Hotel Jiwar Taibah", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 450], ["Triple", 500], ["Quad", 550]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 550], ["Triple", 600], ["Quad", 650]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 650], ["Triple", 700], ["Quad", 750]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 750], ["Triple", 800], ["Quad", 850]]]
    ]
  ],
  [
    "Hotel Sedrat Al Madina", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 450], ["Triple", 500], ["Quad", 550]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 600], ["Triple", 650], ["Quad", 700]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 650], ["Triple", 700], ["Quad", 750]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 750], ["Triple", 800], ["Quad", 850]]]
    ]
  ],
  [
    "Hotel Manazel Taibah Al Salam", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 370], ["Triple", 420], ["Quad", 470]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 470], ["Triple", 520], ["Quad", 570]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 530], ["Triple", 580], ["Quad", 630]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 600], ["Triple", 650], ["Quad", 700]]]
    ]
  ],
  // Page 18
  [
    "Hotel Kayan Al Masi", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/09/2026", [["Double", 390], ["Triple", 430], ["Quad", 470]]],
      ["14/09/2026 TO 16/12/2026", [["Double", 470], ["Triple", 510], ["Quad", 550]]]
    ]
  ],
  [
    "Hotel Bara Taibah", "Madinah", 3, "FB", [
      ["15/07/2026 TO 14/09/2026", [["Double", 390], ["Triple", 430], ["Quad", 470]]],
      ["14/09/2026 TO 16/12/2026", [["Double", 470], ["Triple", 510], ["Quad", 550]]]
    ]
  ],
  [
    "Hotel Burj Mawaddah", "Madinah", 3, "FB", [
      ["01/07/2026 TO 31/07/2026", [["Double", 330], ["Triple", 375], ["Quad", 420]]]
    ]
  ],
  [
    "Hotel Al Mokhtara Plaza", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 450], ["Triple", 500], ["Quad", 550], ["Quint", 600]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 480], ["Triple", 530], ["Quad", 580], ["Quint", 630]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 510], ["Triple", 560], ["Quad", 610], ["Quint", 660]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 650], ["Triple", 700], ["Quad", 750], ["Quint", 800]]]
    ]
  ],
  [
    "Hotel Sanabel Al Madina", "Madinah", 3, "FB", [
      ["01/07/2026 TO 31/07/2026", [["Double", 570], ["Triple", 650], ["Quad", 720]]],
      ["01/08/2026 TO 30/08/2026", [["Double", 590], ["Triple", 670], ["Quad", 750]]]
    ]
  ],
  // Page 19
  [
    "Hotel Kayan International", "Madinah", 3, "FB", [
      ["01/07/2026 TO 01/09/2026", [["Double", 480], ["Triple", 525], ["Quad", 570]]]
    ]
  ],
  [
    "Hotel Wardat Al Rayan", "Madinah", 3, "FB", [
      ["01/07/2026 TO 01/09/2026", [["Double", 450], ["Triple", 495], ["Quad", 540]]]
    ]
  ],
  [
    "Hotel Wardat Saadah", "Madinah", 3, "FB", [
      ["01/07/2026 TO 01/09/2026", [["Double", 440], ["Triple", 485], ["Quad", 530]]]
    ]
  ],
  [
    "Hotel Jawharat Al Rasheed", "Madinah", 3, "FB", [
      ["01/06/2026 TO 31/07/2026", [["Double", 380], ["Triple", 425], ["Quad", 470]]]
    ]
  ],
  [
    "Hotel Mirage Salam", "Madinah", 3, "FB", [
      ["02/07/2026 TO 15/08/2026", [["Double", 470], ["Triple", 535], ["Quad", 580], ["Quint", 625]]],
      ["16/08/2026 TO 20/10/2026", [["Double", 540], ["Triple", 585], ["Quad", 630], ["Quint", 675]]]
    ]
  ],
  [
    "Hotel Rose Holiday I2", "Madinah", 3, "FB", [
      ["01/07/2026 TO 31/07/2026", [["Double", 350], ["Triple", 395], ["Quad", 440]]]
    ]
  ],
  [
    "Hotel Rose Holiday I3", "Madinah", 3, "FB", [
      ["01/07/2026 TO 31/07/2026", [["Double", 380], ["Triple", 425], ["Quad", 470]]]
    ]
  ],
  [
    "Hotel Swiss International", "Madinah", 3, "FB", [
      ["30/06/2026 TO 19/08/2026", [["Double", 500], ["Triple", 550], ["Quad", 600]]],
      ["19/08/2026 TO 21/10/2026", [["Double", 550], ["Triple", 600], ["Quad", 650]]]
    ]
  ],
  // Page 20
  [
    "Hotel Manazel Al Taqwa", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 450], ["Triple", 500], ["Quad", 550]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 600], ["Triple", 650], ["Quad", 700]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 650], ["Triple", 700], ["Quad", 750]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 800], ["Triple", 850], ["Quad", 900]]]
    ]
  ],
  [
    "Hotel Sama Al Masi", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 480], ["Triple", 530], ["Quad", 580]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 600], ["Triple", 650], ["Quad", 700]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 750], ["Triple", 800], ["Quad", 850]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 850], ["Triple", 900], ["Quad", 950]]]
    ]
  ],
  [
    "Hotel Sama Al Zahabi", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 450], ["Triple", 500], ["Quad", 550]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 550], ["Triple", 600], ["Quad", 650]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 650], ["Triple", 700], ["Quad", 750]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 750], ["Triple", 800], ["Quad", 850]]]
    ]
  ],
  // Page 21
  [
    "Hotel Maysan Rehab Al Misk", "Madinah", 4, "FB", [
      ["30/06/2026 TO 20/09/2026", [["Double", 500], ["Triple", 560], ["Quad", 620]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 525], ["Triple", 585], ["Quad", 645]]]
    ]
  ],
  [
    "Hotel Arkan Al Manar", "Madinah", 4, "FB", [
      ["30/06/2026 TO 20/09/2026", [["Double", 500], ["Triple", 560], ["Quad", 620]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 525], ["Triple", 585], ["Quad", 645]]]
    ]
  ],
  [
    "Hotel Maysan Al Taqwa", "Madinah", 4, "FB", [
      ["23/06/2026 TO 20/09/2026", [["Double", 430], ["Triple", 480], ["Quad", 530]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 460], ["Triple", 510], ["Quad", 560]]]
    ]
  ],
  [
    "Hotel Plaza Inn Ohud", "Madinah", 3, "FB", [
      ["26/06/2026 TO 20/09/2026", [["Double", 405], ["Triple", 455], ["Quad", 505]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 425], ["Triple", 475], ["Quad", 525]]]
    ]
  ],
  [
    "Hotel Maysan Rotana El Mesk", "Madinah", 4, "FB", [
      ["15/07/2026 TO 20/09/2026", [["Double", 500], ["Triple", 560], ["Quad", 620]]],
      ["20/09/2026 TO 22/10/2026", [["Double", 525], ["Triple", 585], ["Quad", 645]]]
    ]
  ],
  // Page 22
  [
    "Hotel One Inn", "Madinah", 3, "FB", [
      ["30/06/2026 TO 15/07/2026", [["Double", 455], ["Triple", 500], ["Quad", 545]]],
      ["15/07/2026 TO 12/09/2026", [["Double", 505], ["Triple", 550], ["Quad", 595]]],
      ["12/09/2026 TO 12/10/2026", [["Double", 530], ["Triple", 575], ["Quad", 620]]],
      ["12/10/2026 TO 10/12/2026", [["Double", 635], ["Triple", 680], ["Quad", 725]]]
    ]
  ],
  [
    "Hotel Triple One", "Madinah", 3, "FB", [
      ["30/06/2026 TO 15/07/2026", [["Double", 410], ["Triple", 455], ["Quad", 500]]],
      ["15/07/2026 TO 14/08/2026", [["Double", 460], ["Triple", 505], ["Quad", 550]]],
      ["14/08/2026 TO 12/09/2026", [["Double", 525], ["Triple", 570], ["Quad", 615]]],
      ["12/09/2026 TO 12/10/2026", [["Double", 560], ["Triple", 605], ["Quad", 650]]],
      ["12/10/2026 TO 10/12/2026", [["Double", 605], ["Triple", 650], ["Quad", 695]]]
    ]
  ],
  [
    "Hotel Qasr Al Ansar Golden Tulip", "Madinah", 3, "FB", [
      ["30/06/2026 TO 15/07/2026", [["Double", 370], ["Triple", 415], ["Quad", 480]]],
      ["15/07/2026 TO 14/08/2026", [["Double", 430], ["Triple", 475], ["Quad", 520]]],
      ["14/08/2026 TO 12/09/2026", [["Double", 490], ["Triple", 535], ["Quad", 580]]],
      ["12/09/2026 TO 12/10/2026", [["Double", 520], ["Triple", 565], ["Quad", 610]]],
      ["12/10/2026 TO 10/12/2026", [["Double", 565], ["Triple", 610], ["Quad", 655]]]
    ]
  ],
  // Page 23
  [
    "Hotel Saraya Harmony", "Madinah", 3, "FB", [
      ["31/06/2026 TO 13/08/2026", [["Double", 400], ["Triple", 450], ["Quad", 500]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 450], ["Triple", 500], ["Quad", 550]]],
      ["12/10/2026 TO 07/02/2027", [["Double", 550], ["Triple", 600], ["Quad", 650]]],
      ["08/02/2027 TO 22/02/2027", [["Double", 600], ["Triple", 650], ["Quad", 700]]],
      ["22/02/2027 TO 08/03/2027", [["Double", 650], ["Triple", 750], ["Quad", 850]]]
    ]
  ],
  [
    "Hotel Rehab Harmony", "Madinah", 3, "FB", [
      ["31/06/2026 TO 13/08/2026", [["Double", 300], ["Triple", 350], ["Quad", 400]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 350], ["Triple", 400], ["Quad", 450]]],
      ["12/10/2026 TO 07/02/2027", [["Double", 400], ["Triple", 450], ["Quad", 500]]],
      ["08/02/2027 TO 22/02/2027", [["Double", 500], ["Triple", 550], ["Quad", 600]]],
      ["22/02/2027 TO 08/03/2027", [["Double", 550], ["Triple", 600], ["Quad", 650]]]
    ]
  ],
  // Page 24
  [
    "Winner Inn Al Kheir ex Concorde Dar Al Khair", "Madinah", 3, "FB", [
      ["30/06/2026 TO 20/08/2026", [["Double", 575], ["Triple", 625], ["Quad", 675]]],
      ["20/08/2026 TO 12/11/2026", [["Double", 630], ["Triple", 680], ["Quad", 730]]],
      ["12/11/2026 TO 17/12/2026", [["Double", 700], ["Triple", 750], ["Quad", 800]]]
    ]
  ],
  [
    "Hotel Al Ansar Golden Tulip", "Madinah", 3, "FB", [
      ["30/06/2026 TO 20/08/2026", [["Double", 520], ["Triple", 565], ["Quad", 610]]],
      ["20/08/2026 TO 12/11/2026", [["Double", 590], ["Triple", 635], ["Quad", 680]]],
      ["12/11/2026 TO 17/12/2026", [["Double", 690], ["Triple", 735], ["Quad", 780]]]
    ]
  ],
  [
    "Hotel Rose Holiday I1", "Madinah", 3, "FB", [
      ["01/07/2026 TO 15/08/2026", [["Double", 340], ["Triple", 385], ["Quad", 430]]],
      ["16/08/2026 TO 30/09/2026", [["Double", 360], ["Triple", 405], ["Quad", 450]]]
    ]
  ],
  [
    "Sebal Hotel", "Madinah", 3, "FB", [
      ["01/07/2026 TO 30/07/2026", [["Double", 390], ["Triple", 435], ["Quad", 480]]]
    ]
  ],
  [
    "Hotel Sebal Palace", "Madinah", 3, "FB", [
      ["01/07/2026 TO 30/07/2026", [["Double", 390], ["Triple", 435], ["Quad", 480]]]
    ]
  ],
  [
    "Hotel Sebal Al Masi", "Madinah", 3, "FB", [
      ["01/07/2026 TO 30/07/2026", [["Double", 500], ["Triple", 550], ["Quad", 600]]]
    ]
  ],
  // Page 25
  [
    "Hotel Zowar International", "Madinah", 4, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 490], ["Triple", 555], ["Quad", 620], ["Quint", 685]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 540], ["Triple", 605], ["Quad", 670], ["Quint", 755]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 620], ["Triple", 685], ["Quad", 750], ["Quint", 815]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 740], ["Triple", 835], ["Quad", 930], ["Quint", 1025]]]
    ]
  ],
  [
    "Hotel Odest Al Madina", "Madinah", 4, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 490], ["Triple", 555], ["Quad", 620], ["Quint", 685]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 540], ["Triple", 605], ["Quad", 670], ["Quint", 755]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 620], ["Triple", 685], ["Quad", 750], ["Quint", 815]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 740], ["Triple", 835], ["Quad", 930], ["Quint", 1025]]]
    ]
  ],
  [
    "Hotel Al Mokhtara International", "Madinah", 4, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 470], ["Triple", 535], ["Quad", 600], ["Quint", 665]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 520], ["Triple", 585], ["Quad", 650], ["Quint", 715]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 600], ["Triple", 665], ["Quad", 730], ["Quint", 795]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 720], ["Triple", 815], ["Quad", 910], ["Quint", 1005]]]
    ]
  ],
  // Page 26
  [
    "Hotel Abraj Tabah", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 500], ["Triple", 550], ["Quad", 600]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 650], ["Triple", 700], ["Quad", 750]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 750], ["Triple", 800], ["Quad", 850]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 900], ["Triple", 950], ["Quad", 1000]]]
    ]
  ],
  [
    "Hotel Safwat Al Madina", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 530], ["Triple", 580], ["Quad", 630]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 700], ["Triple", 750], ["Quad", 800]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 800], ["Triple", 850], ["Quad", 900]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 950], ["Triple", 1000], ["Quad", 1050]]]
    ]
  ],
  [
    "Hotel Manazel Al Falah", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 480], ["Triple", 530], ["Quad", 580]]],
      ["14/08/2026 TO 11/10/2026", [["Double", 600], ["Triple", 650], ["Quad", 700]]],
      ["11/10/2026 TO 01/12/2026", [["Double", 700], ["Triple", 750], ["Quad", 800]]],
      ["01/12/2026 TO 02/02/2027", [["Double", 800], ["Triple", 850], ["Quad", 900]]]
    ]
  ],
  // Page 27
  [
    "Hotel Diyafat Al Mokhtara", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Triple", 470], ["Quad", 520]]],
      ["15/08/2026 TO 20/09/2026", [["Triple", 500], ["Quad", 550]]],
      ["21/09/2026 TO 08/12/2026", [["Triple", 530], ["Quad", 580]]],
      ["09/12/2026 TO 01/02/2027", [["Triple", 670], ["Quad", 720]]]
    ]
  ],
  [
    "Hotel Al Mokhtara Tower", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Triple", 400], ["Quad", 460]]],
      ["15/08/2026 TO 20/09/2026", [["Triple", 430], ["Quad", 490]]],
      ["21/09/2026 TO 08/12/2026", [["Triple", 450], ["Quad", 510]]],
      ["09/12/2026 TO 01/02/2027", [["Triple", 520], ["Quad", 580]]]
    ]
  ],
  // Page 28
  [
    "Hotel Jadda Al Ghamama", "Madinah", 3, "FB", [
      ["30/06/2026 TO 15/07/2026", [["Double", 260], ["Triple", 300], ["Quad", 340]]],
      ["15/07/2026 TO 15/08/2026", [["Double", 320], ["Triple", 360], ["Quad", 400]]],
      ["15/08/2026 TO 21/10/2026", [["Double", 340], ["Triple", 380], ["Quad", 420]]]
    ]
  ],
  [
    "Hotel Al Saman Al Jadid", "Madinah", 3, "FB", [
      ["30/06/2026 TO 15/07/2026", [["Double", 260], ["Triple", 300], ["Quad", 340]]],
      ["15/07/2026 TO 15/08/2026", [["Double", 320], ["Triple", 360], ["Quad", 400]]],
      ["15/08/2026 TO 21/10/2026", [["Double", 340], ["Triple", 380], ["Quad", 420]]]
    ]
  ],
  // Page 29
  [
    "Hotel Karam Taiba Al Masi", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 425], ["Triple", 470], ["Quad", 555]]],
      ["14/08/2026 TO 31/08/2026", [["Double", 480], ["Triple", 525], ["Quad", 595]]]
    ]
  ],
  [
    "Hotel Karam Elite", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 500], ["Triple", 545], ["Quad", 615]]],
      ["14/08/2026 TO 31/08/2026", [["Double", 525], ["Triple", 570], ["Quad", 630]]]
    ]
  ],
  [
    "Hotel Karam Al Madina", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 425], ["Triple", 470], ["Quad", 555], ["Quint", 625]]],
      ["14/08/2026 TO 31/08/2026", [["Double", 480], ["Triple", 525], ["Quad", 595], ["Quint", 650]]]
    ]
  ],
  [
    "Hotel Karam Al Hejaz", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 410], ["Triple", 455], ["Quad", 540], ["Quint", 615]]],
      ["14/08/2026 TO 31/08/2026", [["Double", 465], ["Triple", 510], ["Quad", 560], ["Quint", 635]]]
    ]
  ],
  [
    "Hotel Karam Al Khair", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 410], ["Triple", 425], ["Quad", 540], ["Quint", 615]]],
      ["14/08/2026 TO 31/08/2026", [["Double", 465], ["Triple", 510], ["Quad", 580], ["Quint", 635]]]
    ]
  ],
  // Page 30
  [
    "Hotel Al Mokhtara Al Gharbi", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 430], ["Triple", 480], ["Quad", 530], ["Quint", 580]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 460], ["Triple", 510], ["Quad", 560], ["Quint", 510]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 490], ["Triple", 540], ["Quad", 590], ["Quint", 640]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 630], ["Triple", 680], ["Quad", 730], ["Quint", 780]]]
    ]
  ],
  [
    "Hotel Grand Zowar", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Triple", 470], ["Quad", 520], ["Quint", 570]]],
      ["15/08/2026 TO 20/09/2026", [["Triple", 500], ["Quad", 550], ["Quint", 600]]],
      ["21/09/2026 TO 08/12/2026", [["Triple", 530], ["Quad", 580], ["Quint", 630]]],
      ["09/12/2026 TO 01/02/2027", [["Triple", 670], ["Quad", 720], ["Quint", 770]]]
    ]
  ],
  [
    "Hotel Rawdat Al Mokhtara", "Madinah", 3, "FB", [
      ["30/06/2026 TO 14/08/2026", [["Double", 430], ["Triple", 480], ["Quad", 530], ["Quint", 580]]],
      ["15/08/2026 TO 20/09/2026", [["Double", 460], ["Triple", 510], ["Quad", 560], ["Quint", 610]]],
      ["21/09/2026 TO 08/12/2026", [["Double", 490], ["Triple", 540], ["Quad", 590], ["Quint", 640]]],
      ["09/12/2026 TO 01/02/2027", [["Double", 630], ["Triple", 680], ["Quad", 730], ["Quint", 780]]]
    ]
  ]
];

// Helper to slugify
function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

// Map compact array to full Hotel[]
const expandedHotels = [...compactHotels, ...makkahHotels].map(([name, city, stars, mealPlan, seasons]) => {
  const id = `${slugify(name)}-alharmain`;
  return {
    id,
    name,
    city,
    vendor: "Alharmain Hotels Management",
    mealPlan,
    stars,
    seasons: seasons.map(([range, prices]) => ({
      range,
      prices: prices.map(([roomType, price]) => ({ roomType, price }))
    }))
  };
});

async function main() {
  console.log(`Loaded ${expandedHotels.length} Alharmain hotels.`);

  // 1. Write/Sync to local hotels.ts
  console.log("Updating src/data/hotels.ts file...");
  const hotelsPath = path.resolve(process.cwd(), 'src/data/hotels.ts');
  const hotelsContent = fs.readFileSync(hotelsPath, 'utf-8');

  const startMarker = 'export const newAlharmainHotels: Hotel[] = [';
  const endMarker = '];\n\nexport const defaultHotels: Hotel[]';

  const startIndex = hotelsContent.indexOf(startMarker);
  const endIndex = hotelsContent.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start/end markers in src/data/hotels.ts!");
    process.exit(1);
  }

  const generatedListStr = expandedHotels.map(h => JSON.stringify(h, null, 2)).join(',\n');
  const newDeclarations = `${startMarker}\n${generatedListStr}\n`;

  const updatedContent = hotelsContent.substring(0, startIndex) + newDeclarations + hotelsContent.substring(endIndex);
  fs.writeFileSync(hotelsPath, updatedContent, 'utf-8');
  console.log("Successfully wrote and updated hotels.ts locally!");

  // 2. Authenticate as Admin/Operasional user
  const adminEmail = 'afadsa76@gmail.com';
  const adminPassword = 'D@rkman31';

  console.log(`Authenticating with client SDK as ${adminEmail}...`);
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("✅ Client SDK Authentication Successful!");
  } catch (error) {
    console.error("❌ Client SDK Authentication Failed:", error);
    process.exit(1);
  }

  // 3. Synchronize to Firestore using CLIENT SDK with signed-in user
  console.log("Uploading/Merging into Firestore collection 'master_hotels' via Client SDK with auth...");

  let index = 0;
  for (const hotel of expandedHotels) {
    index++;
    const hotelId = hotel.id;
    try {
      const docRef = doc(db, "master_hotels", hotelId);
      await setDoc(docRef, {
        ...hotel,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[${index}/${expandedHotels.length}] Synchronized: ${hotelId}`);
    } catch (error) {
      console.error(`Failed to sync ${hotelId}:`, error);
    }
  }

  console.log("Master database successfully updated and synchronized both locally and in Firestore!");
  process.exit(0);
}

// Mock localStorage for the node process since src/firebase imports things that might use it
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0
};

main().catch(console.error);

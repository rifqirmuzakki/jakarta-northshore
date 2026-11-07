/* Hand-curated routing graph for the World view.
   Nodes are named points [lat, lon] (longitudes beyond 180 are the Pacific side, unwrapped). Chains connect consecutive nodes with airspace we route through;
   anything we do NOT want to cross (Russia, Ukraine and Belarus, Iran, Iraq, Syria, and the Black Sea north of Turkey) simply has no node or edge in it.
   Routes are "typical routing", not real airways: edit this file and run `node tools/world/build-routes.js` to regenerate them. */
const N={
 // Jakarta and its six gates (same fixes as the airspace view)
 JKT:[-6.13,106.66],G_W:[-5.95,105.55],G_NW:[-4.95,105.95],G_N:[-4.70,106.95],G_NE:[-5.00,108.00],G_E:[-5.95,108.35],G_S:[-7.20,106.50],
 // Sumatra, Malacca, Andaman Sea, Bay of Bengal
 SUM_C:[-1.0,102.5],SUM_N:[4.0,97.6],SIN_A:[1.5,104.2],MY_W:[3.2,101.4],MY_N:[6.2,100.3],AND_E:[8.0,97.0],AND_C:[9.5,93.5],BOB_C:[13.0,88.0],BOB_N:[19.0,87.0],IN_E:[17.0,82.0],IN_C:[21.5,78.0],IN_N:[28.0,77.3],
 // Indian Ocean and Arabian Sea
 IO_A:[-5.0,100.0],IO_B:[-1.5,92.5],IO_C:[3.0,85.5],SL_S:[5.3,80.5],ARB_A:[7.5,72.5],ARB_B:[12.0,66.0],ARB_C:[18.0,62.0],OMN_A:[22.0,59.0],
 IN_W:[19.0,73.5],MAL:[4.0,73.5],BOB_S:[8.5,88.5],IN_S:[13.5,79.8],ARB_N:[16.0,68.0],SIO_N:[-9.0,75.0],
 // Gulf, Arabia, Red Sea, Egypt
 UAE:[25.0,55.2],QAT:[25.3,51.6],SAU_E:[26.0,48.5],SAU_C:[24.5,45.5],SAU_W:[24.0,39.0],SAU_N:[28.5,36.5],RS_N:[27.5,34.0],CAI_A:[30.0,31.5],
 // Mediterranean, Turkey, Caucasus
 MED_E:[33.5,27.5],MED_C:[36.0,19.0],MED_W:[38.5,8.0],TUR_SW:[36.8,30.5],TUR_C:[39.5,33.0],TUR_NE:[40.6,39.5],GEO:[41.6,44.5],AZ:[41.0,48.5],CASP:[40.6,52.5],TKM:[38.2,60.0],AFG:[34.5,68.5],PAK:[31.5,73.8],
 // Europe
 GR:[38.5,22.5],BAL:[42.5,25.0],SRB:[44.5,20.5],HU:[47.0,19.0],AT:[48.0,14.0],ITA_S:[39.0,15.0],ITA_N:[44.5,10.5],ALPS:[46.5,8.5],DE_C:[50.3,9.0],NL:[52.2,5.5],UK:[51.3,-1.0],FR:[48.5,2.5],BCN_A:[41.5,2.0],MAD_A:[40.4,-3.5],SCAN:[56.0,12.0],BALT:[58.5,22.0],
 // North Africa
 LIB_N:[33.5,12.5],ALG:[36.0,3.0],MOR:[34.0,-6.5],
 // East and Southern Africa, Indian Ocean islands
 SIO_A:[-13.0,86.0],SIO_B:[-20.5,62.0],MAD_S:[-25.0,45.0],JNB_A:[-25.5,30.0],ARB_W:[6.0,56.0],SOM:[7.0,47.0],EAF:[-1.5,41.5],ETH:[9.0,42.5],
 // South China Sea, Vietnam, Thailand, Philippines, Taiwan, China, Korea, Japan
 N_1:[0.0,107.5],SCS_S:[3.5,108.5],SCS_C:[10.5,112.0],SCS_N:[17.0,114.5],HKG_A:[21.0,114.3],VN_S:[10.0,107.5],VN_C:[16.0,108.8],VN_N:[20.8,106.8],TH_G:[9.0,102.0],TH_C:[13.2,100.7],
 BORN_N:[3.0,114.0],PHL_S:[6.0,121.0],PHL_C:[14.0,121.5],LUZ_N:[19.5,121.5],TWS:[24.5,119.5],OKI:[26.5,127.5],KYU:[31.5,131.5],HNS:[35.0,137.5],
 CN_S:[23.0,111.0],CN_E:[28.5,118.0],CN_C:[30.5,112.0],CN_W:[26.0,104.0],CN_N:[36.5,114.0],YS_S:[33.0,123.0],YS_N:[37.0,122.5],KOR_W:[36.0,126.0],
 // North Pacific to North America and Hawaii
 NP_1:[41.0,155.0],NP_2:[49.0,175.0],NP_3:[50.0,190.0],NP_4:[46.0,220.0],HI_1:[11.0,140.0],HI_2:[15.0,172.0],HI_3:[19.0,190.0],
 // Eastern Indonesia, Papua, Pacific islands
 JS_E:[-7.5,114.5],FLO:[-8.5,122.0],BAN:[-5.5,129.0],PAP_C:[-4.0,137.0],PAP_E:[-3.0,141.5],E_3:[-10.0,135.0],PNG:[-9.5,147.0],SOL:[-9.5,160.0],VAN:[-16.0,170.0],
 // Australia and New Zealand
 E_1:[-9.0,118.0],E_2:[-9.5,126.0],DRW_A:[-12.0,130.8],AUS_C:[-19.5,133.5],AUS_SA:[-28.5,135.5],AUS_EC:[-25.5,144.0],AUS_EQ:[-21.0,148.0],AUS_SE:[-33.5,148.5],
 W_AUS_1:[-16.0,111.5],W_AUS_2:[-26.0,113.5],TAS_A:[-30.5,160.0],TAS_B:[-39.0,166.0],NZ_N:[-35.5,172.5]
};
/* chains: consecutive nodes are connected */
const CHAINS=[
 // west and northwest: Sumatra, Andaman Sea, India, onward to Europe
 ['G_NW','SUM_C','SUM_N','AND_C','BOB_C','IN_E','IN_C','IN_N','PAK','AFG','TKM','CASP','AZ','GEO','TUR_NE','TUR_C'],
 ['TUR_C','BAL','SRB','HU','AT','DE_C'],['AT','ALPS'],['DE_C','NL','UK'],['NL','SCAN'],['DE_C','FR','UK'],['SCAN','BALT'],['ALPS','ITA_N'],
 ['G_NW','SIN_A','MY_W','MY_N','AND_E','AND_C'],['G_NW','SUM_C','MY_W'],['SUM_N','AND_E'],['BOB_C','BOB_N'],
 // west: Indian Ocean, Arabian Sea, Gulf, Arabia, Egypt, Mediterranean
 ['G_W','IO_A','IO_B','IO_C','SL_S','ARB_A','ARB_B','ARB_C','OMN_A','UAE','QAT','SAU_E','SAU_C','SAU_W','SAU_N','RS_N','CAI_A','MED_E','MED_C','MED_W'],
 ['SAU_W','RS_N'],['MED_E','TUR_SW','TUR_C'],['MED_C','ITA_S','GR'],['ITA_S','ITA_N'],['MED_C','ITA_N'],['GR','BAL'],['MED_W','BCN_A','MAD_A'],['BCN_A','FR'],['ITA_N','ALPS','DE_C'],
 ['MED_C','LIB_N','ALG','MOR'],['MED_W','ALG'],['IN_C','IN_W','ARB_B'],['IN_E','SL_S'],['IO_C','MAL','ARB_A'],['ARB_A','IN_W'],['IN_N','IN_W'],['PAK','IN_W'],
 // east and southern Africa, Indian Ocean islands
 ['IO_B','SIO_A','SIO_B','MAD_S','JNB_A'],['ARB_B','ARB_W','SOM','EAF'],['SOM','ETH'],['SIO_B','EAF'],['EAF','JNB_A'],
 // north: South China Sea, Vietnam, Thailand, China, Taiwan
 ['G_N','N_1','SCS_S','SCS_C','SCS_N','HKG_A','CN_S'],['SCS_S','VN_S','VN_C','VN_N'],['SCS_C','VN_C'],['SCS_S','TH_G','TH_C'],['N_1','SIN_A'],['VN_N','CN_W','CN_C','CN_N'],['CN_S','CN_C'],['HKG_A','CN_E','CN_N'],['CN_E','YS_S','YS_N','KOR_W'],['SCS_N','TWS','CN_E'],['CN_N','YS_N'],
 // northeast: Borneo, Philippines, Taiwan, Japan, North Pacific
 ['G_NE','BORN_N','PHL_S','PHL_C','LUZ_N','TWS','OKI','KYU','HNS'],['SCS_C','PHL_C'],['TWS','CN_E'],['OKI','YS_S'],['KYU','YS_S'],['HNS','NP_1','NP_2','NP_3','NP_4'],
 ['PHL_S','HI_1','HI_2','HI_3'],['LUZ_N','OKI'],['KYU','HNS'],['HNS','KOR_W'],
 // east: Indonesia, Papua, Pacific, Australia, New Zealand
 ['G_E','JS_E','FLO','BAN','PAP_C','PAP_E','PNG','SOL','VAN'],['BAN','PHL_S'],['G_E','E_1','E_2','DRW_A','AUS_C','AUS_SA'],['AUS_C','AUS_EC','AUS_SE'],['AUS_EC','AUS_EQ','TAS_A','NZ_N'],['AUS_SE','TAS_B','NZ_N'],['AUS_SE','AUS_EQ'],['AUS_SA','AUS_SE'],['E_2','E_3','PNG'],['FLO','E_2'],['PAP_C','E_3'],
 ['G_S','W_AUS_1','W_AUS_2'],['W_AUS_1','AUS_SA'],
 // cross links so a gate has more than one way out (neighbouring gates are a few miles apart)
 ['G_NE','N_1'],['G_N','BORN_N'],['G_W','SUM_C'],['G_S','IO_A'],['G_E','E_1'],['G_NW','IO_A']
];
module.exports={N,CHAINS};

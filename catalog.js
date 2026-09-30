// Verified identities used only for duplicate detection and themed recommendation seeds.
const HALLOWEEN_TMDB_IDS = {
  "Beetlejuice (1988)": 4011,
  "Casper (1995)": 8839,
  "Coraline (2009)": 14836,
  "Don't Look Under The Bed (1999)": 70772,
  "Halloween (1978)": 948,
  "Halloweentown (1998)": 27850,
  "Halloweentown II Kalabars Revenge (2001)": 34205,
  "Haunted Mansion (2023)": 616747,
  "Hocus Pocus (1993)": 10439,
  "Hocus Pocus 2 (2022)": 642885,
  "It's The Great Pumpkin, Charlie Brown (1966)": 13353,
  "Lonesome Ghosts (1937)": 32428,
  "Mickey's House Of Villains (2001)": 22643,
  "Muppets Haunted Mansion (2021)": 826914,
  "Something Wicked This Way Comes (1983)": 24808,
  "The Black Cauldron (1985)": 10957,
  "The Nightmare Before Christmas (1993)": 9479,
  "The Orphanage (2007)": 6537,
  "Trick 'r Treat (2007)": 23202,
  "The Addams Family (1991)": 2907,
  "The Addams Family Values (1993)": 2758,
  "Frankenweenie (2012)": 62214,
  "ParaNorman (2012)": 77174,
  "The Witches (1990)": 10166,
  "The Others (2001)": 1933,
  "Gremlins (1984)": 927,
  "The Conjuring (2013)": 138843
};

// Verified TMDB poster paths for the curated Halloween titles (2026-09-30).
// Mickey’s House of Villains is dated 2002 by TMDB; the existing playlist title is preserved.
const HALLOWEEN_POSTERS = {
  "Beetlejuice (1988)": "/nnl6OWkyPpuMm595hmAxNW3rZFn.jpg",
  "Casper (1995)": "/2ah8fNJFZVU3vcXhU5xfAYi2eym.jpg",
  "Coraline (2009)": "/4jeFXQYytChdZYE9JYO7Un87IlW.jpg",
  "Don't Look Under The Bed (1999)": "/hsa9gmUnaWPnsD7EBcsxqo1Rlze.jpg",
  "Halloween (1978)": "/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg",
  "Halloweentown (1998)": "/y9RJCxJMbWqhXjkBgC0VXETmHj6.jpg",
  "Halloweentown II Kalabars Revenge (2001)": "/uDnp52aGXxnfU4vqnnc6YpfzjHb.jpg",
  "Haunted Mansion (2023)": "/8Im6DknDVxRiGXc5t8rVOJyzuNx.jpg",
  "Hocus Pocus (1993)": "/by4D4Q9NlUjFSEUA1yrxq6ksXmk.jpg",
  "Hocus Pocus 2 (2022)": "/7ze7YNmUaX81ufctGqt0AgHxRtL.jpg",
  "It's The Great Pumpkin, Charlie Brown (1966)": "/59wp9OWexYsxlSPHYmVLsl5xlFt.jpg",
  "Lonesome Ghosts (1937)": "/ydAWe33OKMxkwd4piuQdKDVr3qO.jpg",
  "Mickey's House Of Villains (2001)": "/82qQAp7rcAwVnW12xbkVImp0unP.jpg",
  "Muppets Haunted Mansion (2021)": "/AeVMV8cMvNhn6aKozAH3pysvftm.jpg",
  "Something Wicked This Way Comes (1983)": "/94dMO6kAawyFUk0sCDGIjAnchED.jpg",
  "The Black Cauldron (1985)": "/h64i9e6oJs2jrDZ4QzspXMqZhPF.jpg",
  "The Nightmare Before Christmas (1993)": "/oQffRNjK8e19rF7xVYEN8ew0j7b.jpg",
  "The Orphanage (2007)": "/vIpi1KtHLXUOfSVC2m6MqpjSPgL.jpg",
  "Trick 'r Treat (2007)": "/w0nmol4g7n6MFfhfphV7GzHHYjB.jpg",
  "The Addams Family (1991)": "/qFf8anju5f2epI0my8RdwwIXFIP.jpg",
  "The Addams Family Values (1993)": "/sdxT2VjVSx9DRicwnuECUdBHeE7.jpg",
  "Frankenweenie (2012)": "/yGjVbLVdZRBlZTTQVBsj2KUjL1s.jpg",
  "ParaNorman (2012)": "/9DZPtuYTKYxt6vzHvZ5FLThG4fl.jpg",
  "The Witches (1990)": "/mPYBjVkeHakkPGY7WaKyyNU4RWm.jpg",
  "The Others (2001)": "/p8g1vlTvpM6nr2hMMiZ1fUlKF0D.jpg",
  "Gremlins (1984)": "/6m0F7fsXjQvUbCZrPWcJNrjvIui.jpg",
  "The Conjuring (2013)": "/wVYREutTvI2tmxr6ujrHT704wGF.jpg"
};

// Editorial offline catalogue. These synopses and mood/collection labels are
// local curation, not TMDB data or AI-personalized recommendations.
function curatedMovie(theme, title, runtimeMinutes, genres, moods, collections, ptOverview, enOverview) {
  const year = Number(title.match(/\((\d{4})\)\s*$/)?.[1] ?? 0) || null;
  const slug = title.toLocaleLowerCase('en-US').replace(/\(\d{4}\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `curated:${theme}:${slug}-${year ?? 'unknown'}`,
    title, year, runtimeMinutes, genres, moods, collections,
    overview: { 'pt-PT': ptOverview, en: enOverview },
    posterUrl: theme === 'halloween' && HALLOWEEN_POSTERS[title] ? `https://image.tmdb.org/t/p/w342${HALLOWEEN_POSTERS[title]}` : null, tmdbRating: null, tmdbId: null, imdbId: null, source: 'curated'
  };
}

const CURATED_CATALOG = {
  halloween: [
    curatedMovie('halloween', 'Beetlejuice (1988)', 92, ['Comedy', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family', 'halloween-classics'], 'Um casal recém-falecido pede ajuda a um espírito caótico para afastar os novos moradores da sua casa.', 'A recently deceased couple asks a chaotic spirit to drive the new owners out of their home.'),
    curatedMovie('halloween', 'Casper (1995)', 100, ['Family', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family'], 'Uma menina e o pai mudam-se para uma mansão habitada por fantasmas, incluindo o simpático Casper.', 'A girl and her father move into a mansion inhabited by ghosts, including the friendly Casper.'),
    curatedMovie('halloween', 'Coraline (2009)', 100, ['Animation', 'Fantasy', 'Horror'], ['scary', 'nostalgic'], ['halloween-family'], 'Coraline encontra uma versão inquietante da sua vida do outro lado de uma porta escondida.', 'Coraline finds an unsettling version of her life on the other side of a hidden door.'),
    curatedMovie('halloween', "Don't Look Under The Bed (1999)", 93, ['Family', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family'], 'Uma adolescente tenta provar que os estranhos acontecimentos na cidade não são obra de um amigo imaginário.', 'A teenager tries to prove that strange events in town are not the work of an imaginary friend.'),
    curatedMovie('halloween', 'Halloween (1978)', 91, ['Horror', 'Thriller'], ['scary', 'nostalgic'], ['horror', 'halloween-classics'], 'Na noite de Halloween, uma jovem é perseguida por uma figura mascarada que escapou de um hospital psiquiátrico.', 'On Halloween night, a young woman is stalked by a masked figure who escaped a psychiatric hospital.'),
    curatedMovie('halloween', 'Halloweentown (1998)', 84, ['Family', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family'], 'Uma jovem descobre que pertence a uma família de bruxas e visita uma cidade cheia de criaturas mágicas.', 'A teenager discovers she comes from a family of witches and visits a town full of magical creatures.'),
    curatedMovie('halloween', "Halloweentown II Kalabars Revenge (2001)", 81, ['Family', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family'], 'A família Cromwell regressa a Halloweentown para impedir um plano que ameaça os seus habitantes.', 'The Cromwell family returns to Halloweentown to stop a plot threatening its residents.'),
    curatedMovie('halloween', 'Haunted Mansion (2023)', 123, ['Comedy', 'Fantasy', 'Horror'], ['light'], ['halloween-family'], 'Uma mãe e o filho procuram ajuda para lidar com os fantasmas da mansão onde vivem.', 'A mother and her son seek help dealing with the ghosts in their mansion.'),
    curatedMovie('halloween', 'Hocus Pocus (1993)', 96, ['Comedy', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family', 'halloween-classics'], 'Três bruxas regressam a Salem e um grupo de miúdos tenta travar os seus planos na noite de Halloween.', 'Three witches return to Salem, and a group of kids tries to stop their plans on Halloween night.'),
    curatedMovie('halloween', 'Hocus Pocus 2 (2022)', 103, ['Comedy', 'Fantasy'], ['light'], ['halloween-family'], 'Duas amigas acendem uma vela mágica e fazem regressar as irmãs Sanderson.', 'Two friends light a magical candle and bring the Sanderson sisters back.'),
    curatedMovie('halloween', "It's The Great Pumpkin, Charlie Brown (1966)", 25, ['Animation', 'Comedy'], ['light', 'nostalgic'], ['halloween-family', 'halloween-classics'], 'Linus espera pelo Grande Abóbora enquanto Charlie Brown e os amigos celebram o Halloween.', 'Linus waits for the Great Pumpkin while Charlie Brown and his friends celebrate Halloween.'),
    curatedMovie('halloween', 'Lonesome Ghosts (1937)', 9, ['Animation', 'Comedy'], ['light', 'nostalgic'], ['halloween-family', 'halloween-classics'], 'Mickey, Donald e Pateta trabalham como caçadores de fantasmas numa casa assombrada.', 'Mickey, Donald and Goofy work as ghost exterminators in a haunted house.'),
    curatedMovie('halloween', "Mickey's House Of Villains (2001)", 68, ['Animation', 'Comedy'], ['light', 'nostalgic'], ['halloween-family'], 'Os vilões da Disney tomam conta do clube de Mickey durante uma noite de histórias assustadoras.', 'Disney villains take over Mickey’s club for a night of spooky stories.'),
    curatedMovie('halloween', 'Muppets Haunted Mansion (2021)', 52, ['Comedy', 'Family', 'Fantasy'], ['light'], ['halloween-family'], 'Gonzo aceita passar uma noite numa mansão assombrada, acompanhado por fantasmas e pelos Muppets.', 'Gonzo agrees to spend a night in a haunted mansion, surrounded by ghosts and the Muppets.'),
    curatedMovie('halloween', 'Something Wicked This Way Comes (1983)', 95, ['Fantasy', 'Horror'], ['scary', 'nostalgic'], ['horror', 'halloween-classics'], 'Dois rapazes descobrem que um misterioso circo traz consigo promessas perigosas.', 'Two boys discover that a mysterious carnival brings dangerous promises.'),
    curatedMovie('halloween', 'The Black Cauldron (1985)', 80, ['Animation', 'Adventure', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family', 'halloween-classics'], 'Um jovem ajudante de pastor parte para impedir que um rei use um caldeirão antigo.', 'A young pig-keeper sets out to stop a king from using an ancient cauldron.'),
    curatedMovie('halloween', 'The Nightmare Before Christmas (1993)', 76, ['Animation', 'Fantasy', 'Musical'], ['light', 'nostalgic'], ['halloween-family', 'halloween-classics'], 'Jack Skellington tenta levar o espírito do Natal para a cidade do Halloween.', 'Jack Skellington tries to bring the spirit of Christmas to Halloween Town.'),
    curatedMovie('halloween', 'The Orphanage (2007)', 105, ['Drama', 'Horror', 'Mystery'], ['scary'], ['horror'], 'Uma mulher regressa ao antigo orfanato onde cresceu e procura o filho desaparecido.', 'A woman returns to the orphanage where she grew up and searches for her missing son.'),
    curatedMovie('halloween', "Trick 'r Treat (2007)", 82, ['Horror', 'Thriller'], ['scary'], ['horror'], 'Várias histórias cruzam-se numa noite de Halloween em que as tradições têm consequências.', 'Several stories intertwine on a Halloween night when traditions have consequences.'),
    curatedMovie('halloween', 'The Addams Family (1991)', 99, ['Comedy', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family', 'halloween-classics'], 'Uma família excêntrica enfrenta um homem que afirma ser um parente há muito desaparecido.', 'An eccentric family faces a man who claims to be a long-lost relative.'),
    curatedMovie('halloween', 'The Addams Family Values (1993)', 94, ['Comedy', 'Fantasy'], ['light', 'nostalgic'], ['halloween-family'], 'A família Addams recebe um novo bebé e desconfia da recém-chegada ama.', 'The Addams family welcomes a new baby and grows suspicious of the new nanny.'),
    curatedMovie('halloween', 'Frankenweenie (2012)', 87, ['Animation', 'Comedy', 'Horror'], ['light'], ['halloween-family'], 'Um rapaz usa a ciência para trazer de volta o seu cão e provoca uma série de acontecimentos estranhos.', 'A boy uses science to bring his dog back, setting off a series of strange events.'),
    curatedMovie('halloween', 'ParaNorman (2012)', 92, ['Animation', 'Adventure', 'Comedy'], ['light'], ['halloween-family'], 'Um rapaz que consegue falar com os mortos tenta salvar a sua cidade de uma antiga maldição.', 'A boy who can speak with the dead tries to save his town from an old curse.'),
    curatedMovie('halloween', 'The Witches (1990)', 91, ['Adventure', 'Family', 'Fantasy'], ['scary', 'nostalgic'], ['halloween-family'], 'Um rapaz de férias num hotel descobre um plano secreto de um grupo de bruxas.', 'A boy on holiday at a hotel discovers a secret plan by a gathering of witches.'),
    curatedMovie('halloween', 'The Others (2001)', 104, ['Horror', 'Mystery', 'Thriller'], ['scary', 'nostalgic'], ['horror', 'halloween-classics'], 'Numa casa isolada, uma mãe e os filhos começam a suspeitar que não estão sozinhos.', 'In an isolated house, a mother and her children begin to suspect they are not alone.'),
    curatedMovie('halloween', 'Gremlins (1984)', 106, ['Comedy', 'Fantasy', 'Horror'], ['scary', 'nostalgic'], ['horror', 'halloween-classics'], 'Um presente invulgar desencadeia o caos quando pequenas criaturas se multiplicam na cidade.', 'An unusual gift unleashes chaos when small creatures multiply across town.'),
    curatedMovie('halloween', 'The Conjuring (2013)', 112, ['Horror', 'Mystery', 'Thriller'], ['scary'], ['horror'], 'Dois investigadores do paranormal ajudam uma família que vive numa casa perturbadora.', 'Two paranormal investigators help a family living in a disturbing house.')
  ],
  christmas: [
    curatedMovie('christmas', 'A Christmas Story (1983)', 93, ['Comedy', 'Family'], ['light', 'nostalgic'], ['christmas-family', 'christmas-classics'], 'Ralphie tenta convencer a família de que uma carabina de ar comprimido é o presente de Natal ideal.', 'Ralphie tries to convince his family that an air rifle is the perfect Christmas present.'),
    curatedMovie('christmas', 'Arthur Christmas (2011)', 97, ['Animation', 'Comedy', 'Family'], ['light'], ['christmas-family'], 'Arthur embarca numa missão para entregar um presente que ficou esquecido na noite de Natal.', 'Arthur sets off to deliver a present that was missed on Christmas Eve.'),
    curatedMovie('christmas', 'Elf (2003)', 97, ['Comedy', 'Family', 'Fantasy'], ['light', 'nostalgic'], ['christmas-family', 'christmas-classics'], 'Criado no Polo Norte, Buddy viaja até Nova Iorque para conhecer o pai.', 'Raised at the North Pole, Buddy travels to New York to meet his father.'),
    curatedMovie('christmas', 'Home Alone (1990)', 103, ['Comedy', 'Family'], ['light', 'nostalgic'], ['christmas-family', 'christmas-classics'], 'Esquecido em casa durante as férias, Kevin prepara-se para proteger a casa de dois assaltantes.', 'Left home alone during the holidays, Kevin prepares to protect the house from two burglars.'),
    curatedMovie('christmas', 'Home Alone 2: Lost in New York (1992)', 120, ['Adventure', 'Comedy', 'Family'], ['light', 'nostalgic'], ['christmas-family'], 'Kevin perde-se em Nova Iorque e volta a cruzar-se com dois antigos adversários.', 'Kevin gets lost in New York and runs into two familiar adversaries.'),
    curatedMovie('christmas', "It's a Wonderful Life (1946)", 130, ['Drama', 'Fantasy'], ['light', 'nostalgic'], ['christmas-classics'], 'Na véspera de Natal, um anjo ajuda George Bailey a ver o impacto da sua vida na comunidade.', 'On Christmas Eve, an angel helps George Bailey see how his life shaped his community.'),
    curatedMovie('christmas', 'Klaus (2019)', 96, ['Animation', 'Adventure', 'Comedy'], ['light'], ['christmas-family'], 'Um carteiro enviado para uma ilha remota conhece um fabricante de brinquedos solitário.', 'A postman sent to a remote island meets a reclusive toymaker.'),
    curatedMovie('christmas', 'Miracle on 34th Street (1947)', 96, ['Drama', 'Family', 'Fantasy'], ['light', 'nostalgic'], ['christmas-classics'], 'Um homem que afirma ser o Pai Natal transforma a vida de uma menina e da sua mãe.', 'A man who claims to be Santa Claus changes the life of a girl and her mother.'),
    curatedMovie('christmas', "National Lampoon's Christmas Vacation (1989)", 97, ['Comedy'], ['light', 'nostalgic'], ['christmas-classics'], 'Clark Griswold tenta organizar o Natal perfeito, apesar de uma sucessão de contratempos.', 'Clark Griswold tries to plan the perfect Christmas despite a string of mishaps.'),
    curatedMovie('christmas', 'The Muppet Christmas Carol (1992)', 85, ['Comedy', 'Family', 'Fantasy'], ['light', 'nostalgic'], ['christmas-family', 'christmas-classics'], 'Os Muppets recontam a visita dos três espíritos a Ebenezer Scrooge.', 'The Muppets retell the story of the three spirits who visit Ebenezer Scrooge.'),
    curatedMovie('christmas', 'The Polar Express (2004)', 100, ['Animation', 'Adventure', 'Family'], ['light', 'nostalgic'], ['christmas-family'], 'Um comboio mágico leva um rapaz numa viagem rumo ao Polo Norte.', 'A magical train takes a boy on a journey to the North Pole.'),
    curatedMovie('christmas', 'The Santa Clause (1994)', 97, ['Comedy', 'Family', 'Fantasy'], ['light', 'nostalgic'], ['christmas-family'], 'Depois de um incidente improvável, Scott aceita um papel inesperado na noite de Natal.', 'After an unexpected incident, Scott takes on a surprising role on Christmas Eve.'),
    curatedMovie('christmas', 'The Nightmare Before Christmas (1993)', 76, ['Animation', 'Fantasy', 'Musical'], ['light', 'nostalgic'], ['christmas-family', 'christmas-classics'], 'Jack Skellington tenta levar o espírito do Natal para a cidade do Halloween.', 'Jack Skellington tries to bring the spirit of Christmas to Halloween Town.'),
    curatedMovie('christmas', 'Scrooged (1988)', 101, ['Comedy', 'Fantasy'], ['nostalgic'], ['christmas-classics'], 'Um executivo de televisão cínico recebe visitas inesperadas na véspera de Natal.', 'A cynical television executive receives unexpected visitors on Christmas Eve.'),
    curatedMovie('christmas', 'White Christmas (1954)', 120, ['Comedy', 'Musical', 'Romance'], ['nostalgic'], ['christmas-classics'], 'Dois artistas juntam-se a um duo de irmãs para ajudar um antigo comandante.', 'Two performers team up with a pair of sisters to help their former commander.'),
    curatedMovie('christmas', 'A Charlie Brown Christmas (1965)', 25, ['Animation', 'Family'], ['light', 'nostalgic'], ['christmas-family', 'christmas-classics'], 'Charlie Brown procura um sentido mais simples para a época festiva.', 'Charlie Brown looks for a simpler meaning to the holiday season.'),
    curatedMovie('christmas', 'The Snowman (1982)', 26, ['Animation', 'Family', 'Fantasy'], ['light', 'nostalgic'], ['christmas-family', 'christmas-classics'], 'Um rapaz constrói um boneco de neve que ganha vida numa noite de inverno.', 'A boy builds a snowman that comes to life on a winter night.'),
    curatedMovie('christmas', 'The Grinch (2018)', 86, ['Animation', 'Comedy', 'Family'], ['light'], ['christmas-family'], 'O Grinch planeia roubar o Natal de Quemlândia, até conhecer Cindy Lou.', 'The Grinch plans to steal Christmas from Whoville, until he meets Cindy Lou.'),
    curatedMovie('christmas', 'The Holiday (2006)', 136, ['Comedy', 'Romance'], ['light', 'nostalgic'], ['christmas-classics'], 'Duas mulheres trocam de casa durante as festas e encontram novas possibilidades.', 'Two women swap homes for the holidays and find new possibilities.'),
    curatedMovie('christmas', 'Krampus (2015)', 98, ['Comedy', 'Fantasy', 'Horror'], ['scary'], ['christmas-classics'], 'Uma família em conflito perde o espírito natalício e atrai uma criatura do folclore.', 'A feuding family loses its holiday spirit and attracts a creature from folklore.'),
    curatedMovie('christmas', 'Violent Night (2022)', 112, ['Action', 'Comedy', 'Fantasy'], ['scary'], ['christmas-classics'], 'Na véspera de Natal, o Pai Natal enfrenta um grupo armado que invadiu uma casa.', 'On Christmas Eve, Santa faces a group of armed intruders at a house.'),
    curatedMovie('christmas', 'Jingle All the Way (1996)', 89, ['Comedy', 'Family'], ['light', 'nostalgic'], ['christmas-family'], 'Um pai tenta encontrar o brinquedo mais procurado na véspera de Natal.', 'A father tries to find the season’s most sought-after toy on Christmas Eve.')
  ]
};

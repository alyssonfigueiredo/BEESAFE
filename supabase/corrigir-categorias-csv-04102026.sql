-- Corrige 80 lugares com categoria errada que entraram pelo import do Overture, a partir do CSV
-- que o Alysson revisou em 04/10/2026 (exportado pelo admin, cruzado com pesquisa web). "outro"
-- marca lugar que não é bar/restaurante/café/balada/hotel de verdade (condomínio, distribuidora,
-- mercado, salão de beleza etc.) — esses saem do mapa (status='hidden', não apaga nada, dá pra
-- reverter trocando o status de volta pra 'active'). Os demais só trocam de categoria e continuam
-- no ar. Rode inteiro no SQL Editor do Supabase; o resultado mostra "UPDATE N" — espera-se perto
-- de 80 (pode ser menos se algum desses lugares já tiver sido editado manualmente).

begin;

with correcoes(nome, lat, lng, nova_categoria) as (
  values
  ('Açaí do rei', -7.90501832962036, -34.9074115753174, 'cafe'),
  ('Bendito açaíteria', -7.92115163803101, -34.9308414459229, 'cafe'),
  ('Boate Hawaii', -7.88988637924194, -34.9041137695312, 'balada'),
  ('PE ABREU E LIMA CENTRO AVENIDA DUQUE DE CAXIAS', -7.90913677215576, -34.9009914398193, 'outro'),
  ('PE ABREU E LIMA CENTRO JOSE PRIMO', -7.9048228263855, -34.9025573730469, 'outro'),
  ('Praça Antônio Vitalino', -7.90517330169678, -34.9010791778564, 'outro'),
  ('PWS - CKR ASSAI ABREU E LIMA', -7.91793966293335, -34.8948535919189, 'outro'),
  ('Chácara Cristã de Curitiba', -25.9888381958008, -49.3332023620605, 'outro'),
  ('Chácara de Retiro Esperança Próximo a Curitiba', -25.9891986846924, -49.3341979980469, 'outro'),
  ('Almirante Tamandaré', -25.3249988555908, -49.3099975585938, 'outro'),
  ('Central de Soluções', -25.3305549621582, -49.2754135131836, 'outro'),
  ('Centro De Treinamento PD Training', -25.2612190246582, -49.2997245788574, 'outro'),
  ('Chás Real', -25.3237209320068, -49.3091239929199, 'outro'),
  ('Condomínio Colinas do Sol', -25.3722629547119, -49.3123397827148, 'outro'),
  ('Distribuidora de Bebidas Ressak', -25.3644218444824, -49.3086357116699, 'outro'),
  ('Distribuidora de Garagem', -25.3316917419434, -49.2744064331055, 'outro'),
  ('Estúdio SCARTARIS', -25.3789501190186, -49.309627532959, 'outro'),
  ('Loteria alto pinheiros', -25.3121547698975, -49.2903060913086, 'outro'),
  ('M & S Conveniência', -25.320671081543, -49.2774963378906, 'outro'),
  ('Mercearia do Português', -25.3490333557129, -49.3045463562012, 'outro'),
  ('Mercearia E Loja Mar', -25.3671817779541, -49.3100700378418, 'outro'),
  ('Oticadcujas', -25.3110885620117, -49.2889671325684, 'outro'),
  ('Padaria Fogazza', -25.3486709594727, -49.2344779968262, 'cafe'),
  ('Peixaria Peixinho Fresco', -25.3433971405029, -49.2713737487793, 'outro'),
  ('Recanto Marista', -25.3292369842529, -49.3009719848633, 'outro'),
  ('Santa Maria Marcenaria.', -25.335521697998, -49.3062477111816, 'outro'),
  ('Valdineypeixefresco', -25.3253536224365, -49.2695999145508, 'outro'),
  ('Açaí da Dinda', -29.9962635040283, -51.0707092285156, 'cafe'),
  ('Açaí da Lara', -29.9966011047363, -51.0680046081543, 'cafe'),
  ('Açaí sub zero', -29.9995784759521, -51.0724830627441, 'cafe'),
  ('Alvorada - AVR', -30.0010681152344, -51.078296661377, 'outro'),
  ('Armarinhos Santo Expedito', -30.0087299346924, -51.0474281311035, 'outro'),
  ('Baile Do Joaozinho', -29.9889945983887, -51.0698356628418, 'balada'),
  ('Bar e Danceteria Nova Geração', -29.9980697631836, -51.0744476318359, 'balada'),
  ('BC confecções', -29.9916915893555, -51.0458030700684, 'outro'),
  ('Casa De Carnes Santo Antônio', -30.0047817230225, -51.0496597290039, 'outro'),
  ('Clau Variedades', -30.0132427215576, -51.0786323547363, 'outro'),
  ('Estética e Barbearia da lê', -30.0193653106689, -51.0637817382812, 'outro'),
  ('EVS - Espaço Vida Saudável Herbalife', -30.0018157958984, -51.0788803100586, 'outro'),
  ('Farias Industria e Comercio de Alimentos', -29.9940795898438, -51.0215950012207, 'outro'),
  ('Ginasio De Esportes Tiradentes', -30.017894744873, -51.0825119018555, 'outro'),
  ('JB Bebidas Alvorada', -29.9983654022217, -51.072582244873, 'outro'),
  ('Lojas Taqi Alvorada', -30.004451751709, -51.0821952819824, 'outro'),
  ('Los Crepes & Açaí', -30.0078182220459, -51.0655326843262, 'cafe'),
  ('Massoterapeuta', -30.0026264190674, -51.074462890625, 'outro'),
  ('Mercado Hall', -30.0274677276611, -51.0640335083008, 'outro'),
  ('Mercado Torrense', -30.0235214233398, -51.078483581543, 'outro'),
  ('Rey do Açaí', -29.9845409393311, -51.0644187927246, 'cafe'),
  ('Skate Park João Goulart', -30.0065364837646, -51.0442733764648, 'outro'),
  ('Studio Nasa Records', -30.0317974090576, -51.0841751098633, 'outro'),
  ('Sul Tchê Produtora', -29.9916019439697, -50.9998016357422, 'outro'),
  ('Tabacaria Duque', -30.0008144378662, -51.0736961364746, 'outro'),
  ('Território do Açaí II', -29.9990406036377, -51.0803604125977, 'cafe'),
  ('AÇAÍ & CIA', -10.941689491272, -37.0798091888428, 'cafe'),
  ('Açai Aju', -10.9754495620728, -37.0391159057617, 'cafe'),
  ('Acai Concept Coroa do Meio', -10.9682092666626, -37.0387420654297, 'cafe'),
  ('Açaí Concept Shopping Jardins', -10.9416208267212, -37.0597133636475, 'cafe'),
  ('Açai da Tia Augusta', -10.9752569198608, -37.0492343902588, 'cafe'),
  ('Açaí do Hulk Aracaju', -10.8979806900024, -37.0795478820801, 'cafe'),
  ('Açai Fruit Show Aju', -10.9451007843018, -37.0483989715576, 'cafe'),
  ('AÇAÍ GOLD', -10.9232606887817, -37.056941986084, 'cafe'),
  ('Açai Na Tigela Tia Augusta', -10.9267730712891, -37.0436935424805, 'cafe'),
  ('Açai OS CARAS', -10.9921703338623, -37.061185836792, 'cafe'),
  ('Açaí padrão', -10.971848487854, -37.0728893280029, 'cafe'),
  ('Acai Paulista', -10.9122076034546, -37.0491771697998, 'cafe'),
  ('Açai Real', -10.9208383560181, -37.0699443817139, 'cafe'),
  ('Açaí Real', -10.940408706665, -37.0843753814697, 'cafe'),
  ('Açaí Supremo', -10.9424304962158, -37.0652523040771, 'cafe'),
  ('ADM - CK FERREIRA COSTA', -10.9462261199951, -37.0754146575928, 'outro'),
  ('ADM - CKR GBARBOSA CENCOSUD', -10.9068727493286, -37.0858993530273, 'outro'),
  ('Adriano Cerqueira Imóveis', -10.9374675750732, -37.0764503479004, 'outro'),
  ('AJU - CK ARACAJU SHOPPING - DC2', -10.9012622833252, -37.0495929718018, 'outro'),
  ('AK Deposito de Bebidas', -10.9323530197144, -37.0604858398438, 'outro'),
  ('Amorim Delicatessen', -10.9655303955078, -37.0564823150635, 'cafe'),
  ('ARACAJU', -10.9362716674805, -37.0550060272217, 'outro'),
  ('Arena Fonte Nova - Salvador Bahia', -10.9330797195435, -37.0592060089111, 'outro'),
  ('ASSEFAZ - Centro de Lazer', -11.0220947265625, -37.0857601165771, 'outro'),
  ('Associação Brasileira da Indústria de Hotéis de Sergipe', -10.9379110336304, -37.0555515289307, 'outro'),
  ('ballare_arteemovimento', -10.9299306869507, -37.046178817749, 'outro'),
  ('Benjamim Estofados', -10.9129166603088, -37.0643882751465, 'outro')
)
update public.places p
set category = c.nova_categoria::public.place_category,
    status = case when c.nova_categoria = 'outro' then 'hidden'::public.content_status else p.status end
from correcoes c
where p.status = 'active'
  and abs(st_y(p.location::geometry) - c.lat) < 0.0001
  and abs(st_x(p.location::geometry) - c.lng) < 0.0001;

commit;

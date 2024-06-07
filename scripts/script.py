import pandas as pd
from sqlalchemy import create_engine

# Create a connection to the database
engine = create_engine('mysql+pymysql://XXX:YYY@coachbot-prod-db.rp.devfactory.com/alphacoachbot')

# Execute the query and save to JSON
df = pd.read_sql("""SELECT cgc.id, s.external_id AS standard, cgc.content 
FROM content_gen_generated_content cgc
JOIN standards s ON cgc.standard_id = s.id
WHERE cgc.content_generator_config_id IN (
  SELECT id FROM content_gen_content_generator_configs
  WHERE content_generator_type = 'MCQ Math' AND version_number = '0.2'
)
AND cgc.status = 'active'
ORDER BY standard;""", con=engine)
df.to_json('generated-content.json', orient='records', indent=2)

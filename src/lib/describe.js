async function getConstraints (instance, tableName) {
  const query = 'SELECT * from information_schema.table_constraints' +
   ' WHERE constraint_schema = \'public\' AND table_name = ?';
  const constraints = await instance.client.raw(query, [tableName]);
  return constraints.rows;
}

async function getIndexes (instance, tableName) {
  const query = 'SELECT' +
    ' t.relname as table_name,' +
    ' i.relname as index_name,' +
    ' a.attname as column_name,' +
    ' am.amname as index_type' +
    ' FROM' +
    ' pg_class t,' +
    ' pg_class i,' +
    ' pg_index ix,' +
    ' pg_attribute a,' +
    ' pg_am am' +
    ' WHERE' +
    ' t.oid = ix.indrelid' +
    ' AND i.oid = ix.indexrelid' +
    ' AND a.attrelid = t.oid' +
    ' AND i.relam = am.oid' +
    ' AND a.attnum = ANY(ix.indkey)' +
    ' AND t.relkind = \'r\'' +
    ' AND t.relname = ?';
  const indexes = await instance.client.raw(query, [tableName]);
  return indexes.rows;
}

module.exports = {
  getConstraints,
  getIndexes
};

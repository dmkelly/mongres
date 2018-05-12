class Model {
  constructor () {
    this.isNew = true;
  }

  toObject () {
    return Object.assign({}, this.data);
  }

  async save () {
    if (this.isNew) {
      const client = this.instance.client;
      this.id = await client(this.Model.tableName)
        .insert(this.data)
        .returning('id');
      this.isNew = false;
      return this;
    }

    return await this.Model.update({
      id: this.id
    }, this.data);
  }
}

module.exports = Model;

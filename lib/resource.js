class Resource {
  constructor(region, id, tagMap) {
    this._region = region;
    this._id = id;
    this._tagMap = tagMap || new Map();
  }

  get region() { return this._region; }
  get id() { return this._id; }
  get tagMap() { return this._tagMap; }

  get title() { return null; }
  get link() { return null; }
}

class Ec2Instance extends Resource {
  get title() {
    const name = this.tagMap.get('Name');
    return `:ec2: Instance ${this.id}` + (name ? ` (${name})` : '');
  }
  get link() {
    return `https://console.aws.amazon.com/ec2/v2/home?region=${this.region}#Instances:instanceId=${this.id}`;
  }
}

class RdsDbCluster extends Resource {
  get title() {
    return `:rds: RDS ${this.id}`;
  }
}

class Vpc extends Resource {
  get title() {
    const name = this.tagMap.get('Name');
    return `:vpc: VPC ${this.id}` + (name ? ` (${name})` : '');
  }
}

export default Resource;
export {
  Ec2Instance,
  RdsDbCluster,
  Vpc,
};

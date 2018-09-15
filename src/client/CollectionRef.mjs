import EventEmitter from './EventEmitter';

class CollectionRef extends EventEmitter {
  constructor(collection) {
    super();
    this.collection = collection;
    this.database = this.collection.database;
    this.ref = this.database.firebase.child(this.collection.name);
  }

  endAt(priority) {
    this.ref = this.ref.endAt(priority);
  }

  limit(num) {
    this.ref = this.ref.limit(num);
  }

  startAt(priority) {
    this.ref = this.ref.startAt(priority);
  }

  on(event, handler) {
    super.on(event, handler);

    if (this.events.insert && this.events.insert.length) {
      this.ref.off('child_added');
      this.ref.on('child_added', snapshot => this.emit('insert', snapshot.val()));
    }

    if (this.events.remove && this.events.remove.length) {
      this.ref.off('child_removed');
      this.ref.on('child_removed', snapshot => this.emit('remove', snapshot.val()));
    }
  }

  off(event, handler = null) {
    super.off(event, handler);

    if ((
      this.events.insert != null ? this.events.insert.length : undefined
    ) === 0) {
      this.ref.off('child_added');
    }

    if ((
      this.events.remove != null ? this.events.remove.length : undefined
    ) === 0) {
      this.ref.off('child_removed');
    }
  }
}

export default CollectionRef;

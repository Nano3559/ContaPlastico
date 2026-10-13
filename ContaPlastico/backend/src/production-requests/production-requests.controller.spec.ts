import { ProductionRequestsController } from './production-requests.controller';
import { ROLES_KEY } from '../auth/roles.decorator';

describe('ProductionRequestsController', () => {
  it('permits admin and production roles to create requests', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, ProductionRequestsController.prototype.create);

    expect(roles).toEqual(expect.arrayContaining(['ADMIN', 'PRODUCCION', 'SUPERVISOR']));
  });
});
